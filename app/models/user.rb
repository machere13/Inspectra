class User < ApplicationRecord
  include NicknameGenerator
  
  has_secure_password
  
  has_many :user_achievements, dependent: :destroy
  has_many :achievements, through: :user_achievements
  
  has_many :user_titles, dependent: :destroy
  has_many :titles, through: :user_titles
  belongs_to :current_title, class_name: 'Title', optional: true

  has_many :interactive_completions, dependent: :destroy
  has_many :interactive_attempts, dependent: :destroy
  
  has_one_attached :avatar
  
  enum :role, {
    user: 0,
    moderator: 1,
    admin: 2,
    super_admin: 3
  }

  enum :game_role, {
    mage: 0,
    warrior: 1,
    priest: 2,
    hunter: 3
  }, prefix: true

  ALLOWED_THEMES = %w[dark white void purple chrome ocean-blue vampire acid-green neon pink].freeze
  # Темы, доступные всем без необходимости что-то проходить.
  DEFAULT_THEMES = %w[dark white].freeze
  validates :theme, inclusion: { in: ALLOWED_THEMES }, allow_nil: true

  # Темы, разблокированные пользователем = базовые + те, что прикреплены к завершённым ачивкам через reward_theme.
  def unlocked_themes
    earned = Achievement
              .joins(:user_achievements)
              .where(user_achievements: { user_id: id })
              .where.not(user_achievements: { completed_at: nil })
              .where.not(reward_theme: nil)
              .pluck(:reward_theme)
    (DEFAULT_THEMES + earned).uniq
  end

  def theme_unlocked?(theme_key)
    return true if DEFAULT_THEMES.include?(theme_key)
    unlocked_themes.include?(theme_key)
  end

  # Бейджи — все ачивки с reward_badge_label, которые пользователь завершил.
  # Возвращает [{ label:, achievement: }, ...]
  def earned_badges
    Achievement
      .joins(:user_achievements)
      .where(user_achievements: { user_id: id })
      .where.not(user_achievements: { completed_at: nil })
      .where.not(reward_badge_label: nil)
      .map { |a| { label: a.reward_badge_label, achievement: a } }
  end

  GAME_ROLE_SPECIALTIES = {
    'mage'    => 'it_security',
    'warrior' => 'it_errors',
    'priest'  => 'legacy',
    'hunter'  => 'dev_diving'
  }.freeze

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: AppConfig::Auth.password_min_length, maximum: AppConfig::Auth.password_max_length }, if: -> { new_record? || !password.nil? }
  
  before_validation :generate_name_if_blank, on: :create
  after_create :check_registration_achievements
  
  def generate_verification_code!
    self.verification_code = SecureRandom.random_number(1000000).to_s.rjust(6, '0')
    self.verification_code_expires_at = AppConfig::Auth.verification_code_ttl_minutes.from_now
    save!
  end
  
  def verification_code_valid?(code)
    verification_code == code && 
    verification_code_expires_at.present? && 
    verification_code_expires_at > Time.current
  end
  
  def verify_email!
    update!(email_verified: true, verification_code: nil, verification_code_expires_at: nil)
  end
  
  def email_verification_required?
    !email_verified?
  end
  
  def completed_achievements
    user_achievements.completed.includes(:achievement)
  end
  
  def in_progress_achievements
    user_achievements.in_progress.includes(:achievement)
  end
  
  def achievement_progress(achievement)
    user_achievements.find_by(achievement: achievement)&.progress || 0
  end
  
  def has_achievement?(achievement)
    user_achievements.exists?(achievement: achievement, completed_at: ..Time.current)
  end
  
  def has_title?(title)
    user_titles.exists?(title: title)
  end
  
  def available_titles
    Title.joins(:user_titles).where(user_titles: { user_id: id }).order('user_titles.earned_at DESC')
  end
  
  def select_title!(title)
    raise ArgumentError unless has_title?(title)
    update!(current_title: title)
  end
  
  def current_title_name
    current_title&.name
  end

  def game_role_required?
    email_verified? && game_role.blank?
  end

  def game_role_label
    return nil if game_role.blank?
    I18n.t("game_roles.#{game_role}.label", default: game_role.to_s.capitalize)
  end

  def specialty_category
    GAME_ROLE_SPECIALTIES[game_role]
  end

  def assign_game_role!(new_role)
    new_role = new_role.to_s
    raise ArgumentError, "Unknown game role: #{new_role}" unless self.class.game_roles.key?(new_role)

    update!(game_role: new_role, game_role_selected_at: Time.current)
  end

  def level
    @level ||= Level.for_experience(experience_points)
  end

  def level_number
    level&.number || 1
  end

  def next_level
    level&.next_level
  end

  def xp_progress_in_current_level
    return 0 unless level
    experience_points - level.required_xp
  end

  def xp_required_for_next_level
    return 0 unless next_level
    next_level.required_xp - (level&.required_xp || 0)
  end

  def xp_remaining_to_next_level
    return 0 unless next_level
    next_level.required_xp - experience_points
  end

  def level_progress_percent
    return 100 unless next_level
    total = xp_required_for_next_level
    return 0 if total.zero?
    ((xp_progress_in_current_level.to_f / total) * 100).round
  end

  def add_experience!(amount)
    amount = amount.to_i
    return if amount <= 0
    previous_level = level
    increment!(:experience_points, amount)
    @level = nil
    previous_level&.number != level&.number ? level : nil
  end

  # Возвращает новое значение streak'а, если сегодня первый просмотр.
  # Возвращает nil, если уже просматривал контент сегодня (idempotent).
  def register_content_view!(now: Time.current)
    today = now.to_date
    return nil if last_content_view_on == today

    new_streak =
      if last_content_view_on == today - 1.day
        current_streak_days + 1
      else
        1
      end

    update!(
      last_content_view_on: today,
      current_streak_days: new_streak,
      longest_streak_days: [longest_streak_days, new_streak].max
    )
    new_streak
  end

  private
  
  def check_registration_achievements
    AchievementService.new(self).check_achievements_for_registration_order
  end

  public

  def generate_reset_password_token!
    update!(
      reset_password_token: SecureRandom.urlsafe_base64(32),
      reset_password_sent_at: Time.current,
      reset_password_requested_at: Time.current
    )
  end

  def clear_reset_password_token!
    update!(reset_password_token: nil, reset_password_sent_at: nil)
  end

  def reset_token_valid?(ttl_minutes: nil)
    ttl = ttl_minutes || AppConfig::Auth.reset_password_token_ttl_minutes.to_i / 60
    reset_password_token.present? && reset_password_sent_at.present? && reset_password_sent_at > ttl.minutes.ago
  end

  private

  def generate_name_if_blank
    return if name.present?
    generate_code_metaphor_name!
  end
end
