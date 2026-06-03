class PagesController < WebController
  layout :determine_layout
  before_action :authenticate_user!, only: [:profile, :profile_config, :select_title, :update_name, :update_avatar, :update_preferences, :request_password_change, :select_game_role, :update_game_role]

  def home
    @current_week = Week.visible_now.order(number: :desc).first
    @expired_weeks = Week.where('expires_at <= ?', Time.current).order(number: :desc)
  end

  def inspectra
    @current_week = Week.visible_now.order(number: :desc).first
    @media_subscription = MediaSubscription.new(email: params[:email])
  end

  def subscribe
    subscription = MediaSubscription.new(email: params[:email])

    if subscription.save
      redirect_to inspectra_path(anchor: 'form'), notice: t('pages.inspectra.subscription_success')
    elsif subscription.errors.of_kind?(:email, :taken)
      redirect_to inspectra_path(anchor: 'form'), notice: t('pages.inspectra.subscription_success')
    else
      redirect_to inspectra_path(email: params[:email], anchor: 'form'), alert: subscription.errors.full_messages.to_sentence
    end
  end

  def profile
    @user = current_user
    @completed_achievements = @user.completed_achievements
    @in_progress_achievements = @user.in_progress_achievements
    @available_titles = @user.available_titles
    @reset_token = params[:token]
    if @reset_token.present? && @user.reset_password_token == @reset_token
      @show_reset_form = @user.reset_token_valid?
    end

    @skill_chart = build_skill_chart(@user)

    @current_interactive = locate_current_interactive(@user)

    @completed_interactives = @user.interactive_completions
                                   .order(completed_at: :desc)
                                   .includes(:interactive)
                                   .limit(20)

    @achievement_groups = build_achievement_groups(@user)

    @active_tab = %w[achievements titles rewards].include?(params[:tab]) ? params[:tab] : 'achievements'
  end

  def profile_config
    @user = current_user
  end

  def update_preferences
    @user = current_user
    attrs = {}
    if params[:theme].present? && User::ALLOWED_THEMES.include?(params[:theme])
      if @user.theme_unlocked?(params[:theme])
        attrs[:theme] = params[:theme]
      else
        redirect_back(fallback_location: profile_config_path, alert: t('pages.profile_config.preferences.theme_locked', default: 'Тема ещё не разблокирована'))
        return
      end
    end
    unless params[:notifications_email].nil?
      attrs[:notifications_email] = ActiveModel::Type::Boolean.new.cast(params[:notifications_email])
    end

    if attrs.empty?
      redirect_back(fallback_location: profile_config_path, alert: t('pages.profile_config.preferences.no_changes', default: 'Нет изменений'))
    elsif @user.update(attrs)
      redirect_back(fallback_location: profile_config_path, notice: t('pages.profile_config.preferences.saved', default: 'Настройки сохранены'))
    else
      redirect_back(fallback_location: profile_config_path, alert: @user.errors.full_messages.join(', '))
    end
  end

  def select_title
    @user = current_user
    title = Title.find(params[:title_id])

    begin
      @user.select_title!(title)
      redirect_to profile_path, notice: t('pages.profile.title_selected', title: title.name)
    rescue ArgumentError
      redirect_to profile_path, alert: t('pages.profile.title_not_available')
    end
  end

  def select_game_role
    @user = current_user
    @available_roles = User.game_roles.keys
    @is_initial_selection = @user.game_role.blank?
  end

  def update_game_role
    @user = current_user
    new_role = params[:game_role].to_s

    unless User.game_roles.key?(new_role)
      redirect_to select_game_role_path, alert: t('pages.select_game_role.invalid_role')
      return
    end

    is_initial = @user.game_role.blank?
    @user.assign_game_role!(new_role)

    if is_initial
      redirect_to profile_path, notice: t('pages.select_game_role.assigned', role: @user.game_role_label)
    else
      redirect_to profile_path, notice: t('pages.select_game_role.changed', role: @user.game_role_label)
    end
  rescue ArgumentError
    redirect_to select_game_role_path, alert: t('pages.select_game_role.invalid_role')
  end

  def update_name
    @user = current_user
    if @user.update(name: params[:name])
      redirect_back(fallback_location: profile_path, notice: t('pages.profile.name_updated'))
    else
      redirect_back(fallback_location: profile_path, alert: @user.errors.full_messages.join(', '))
    end
  end

  def update_avatar
    @user = current_user
    avatar_param = params[:avatar] || params.dig(:user, :avatar)
    if avatar_param.present?
      @user.avatar.attach(avatar_param)
      if @user.avatar.attached?
        Rails.logger.info "Avatar attached successfully: #{@user.avatar.blob.filename}, URL: #{url_for(@user.avatar)}"
        redirect_back(fallback_location: profile_path, notice: t('pages.profile.avatar.updated'))
      else
        Rails.logger.error "Failed to attach avatar"
        redirect_back(fallback_location: profile_path, alert: 'Ошибка при загрузке аватара')
      end
    else
      Rails.logger.error "Avatar param missing. Params: #{params.keys.inspect}"
      redirect_back(fallback_location: profile_path, alert: t('pages.profile.avatar.required'))
    end
  end

  def update_password
    @user = current_user
    current_password = params[:current_password]
    new_password = params[:password]
    password_confirmation = params[:password_confirmation]

    if current_password.blank? || new_password.blank? || password_confirmation.blank?
      redirect_to profile_path, alert: t('pages.profile.password_change.all_fields_required')
      return
    end

    unless @user.authenticate(current_password)
      redirect_to profile_path, alert: t('pages.profile.password_change.wrong_current_password')
      return
    end

    if new_password.length < AppConfig::Auth.password_min_length || new_password.length > AppConfig::Auth.password_max_length
      redirect_to profile_path, alert: t('auth.flashes.password_length_invalid')
      return
    end

    @user.password = new_password
    @user.password_confirmation = password_confirmation
    if @user.save
      redirect_to profile_path, notice: t('pages.profile.password_change.success')
    else
      redirect_to profile_path, alert: @user.errors.full_messages.join(', ')
    end
  end

  def request_password_change
    @user = current_user
    if @user.reset_password_requested_at && @user.reset_password_requested_at > AppConfig::Auth.resend_code_cooldown_seconds.ago
      redirect_to profile_path, alert: t('auth.flashes.email_already_sent_try_later')
      return
    end

    begin
      @user.generate_reset_password_token!
      ResetPasswordMailer.with(user: @user).reset_instructions.deliver_now
      redirect_back(fallback_location: profile_path, notice: t('pages.profile.password_change.email_sent'))
    rescue => e
      Rails.logger.error "Failed to send password reset email: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      redirect_back(fallback_location: profile_path, alert: "Ошибка при отправке письма: #{e.message}")
    end
  end

private

  def build_achievement_groups(user)
    ensure_user_achievements!(user)
    user_progress = user.user_achievements.includes(:achievement).index_by(&:achievement_id)

    result = []
    Achievement.all.group_by { |a| [a.category, a.progress_type] }.each do |(category, _progress_type), group|
      sorted  = group.sort_by(&:progress_target)
      targets = sorted.map(&:progress_target)

      if sorted.size > 1 && targets.uniq.size == targets.size
        result << build_chain_group(sorted, category, user_progress)
      else
        sorted.each { |a| result << build_single_group(a, category, user_progress) }
      end
    end
    result.sort_by { |g| [g[:all_completed] ? 1 : 0, g[:category].to_s, g[:tier].progress_target] }
  end

  def build_chain_group(sorted_tiers, category, user_progress)
    raw_progress    = sorted_tiers.map { |a| user_progress[a.id]&.progress.to_i }.max.to_i
    completed_tiers = sorted_tiers.select { |a| user_progress[a.id]&.completed? }
    next_tier       = sorted_tiers.find { |a| !user_progress[a.id]&.completed? }
    display_tier    = next_tier || sorted_tiers.last
    all_completed   = next_tier.nil?

    {
      key:             "#{category}_#{display_tier.progress_type}_chain",
      category:        category,
      tier:            display_tier,
      progress:        all_completed ? display_tier.progress_target : [raw_progress, display_tier.progress_target].min,
      target:          display_tier.progress_target,
      tiers_total:     sorted_tiers.size,
      tiers_completed: completed_tiers.size,
      all_completed:   all_completed
    }
  end

  def build_single_group(achievement, category, user_progress)
    ua            = user_progress[achievement.id]
    raw_progress  = ua&.progress.to_i
    all_completed = ua&.completed? || false

    {
      key:             "#{category}_#{achievement.id}",
      category:        category,
      tier:            achievement,
      progress:        all_completed ? achievement.progress_target : [raw_progress, achievement.progress_target].min,
      target:          achievement.progress_target,
      tiers_total:     1,
      tiers_completed: all_completed ? 1 : 0,
      all_completed:   all_completed
    }
  end

  def ensure_user_achievements!(user)
    interactive_counts_by_category = user.interactive_completions.group(:category).count
    total_interactives             = user.interactive_completions.count
    registration_order             = User.where('created_at <= ?', user.created_at).count

    Achievement.all.find_each do |a|
      ua = user.user_achievements.find_or_initialize_by(achievement: a)
      previously_completed = ua.completed_at.present?

      new_progress = case a.progress_type
                     when 'registration_order'
                       registration_order
                     when 'total_interactives'
                       a.category == 'general' ? total_interactives : interactive_counts_by_category[a.category].to_i
                     else
                       ua.progress.to_i
                     end

      ua.progress = new_progress

      reached_target = if a.progress_type == 'registration_order'
                         # инвертированная логика: «N-й из первых M» → completed когда order ≤ target
                         new_progress.positive? && new_progress <= a.progress_target
                       else
                         new_progress >= a.progress_target
                       end

      if !previously_completed && reached_target
        ua.completed_at = Time.current
      end
      ua.save! if ua.changed?
    end
  end

  def build_skill_chart(user)
    totals_by_category = Interactive.group(:category).count
    done_by_category   = user.interactive_completions.group(:category).count
    categories = Interactive::CATEGORIES
    overall_total = totals_by_category.values.sum
    overall_done  = done_by_category.values.sum

    rows = categories.map do |cat|
      total = totals_by_category[cat].to_i
      done = done_by_category[cat].to_i
      percent = total.zero? ? 0 : ((done.to_f / total) * 100).round
      {
        key: cat,
        label: I18n.t("achievement_categories.#{cat}", default: cat.titleize),
        percent: percent,
        done: done,
        total: total
      }
    end
    overall_percent = overall_total.zero? ? 0 : ((overall_done.to_f / overall_total) * 100).round
    rows << {
      key: 'overall',
      label: I18n.t('pages.profile.skill_chart.overall', default: 'Общий'),
      percent: overall_percent,
      done: overall_done,
      total: overall_total
    }
    rows
  end

  def locate_current_interactive(user)
    completed_keys = user.interactive_completions.pluck(:interactive_key).to_set
    attempt = user.interactive_attempts
                  .where.not(session_token: nil)
                  .where('session_expires_at > ?', Time.current)
                  .order(last_attempt_at: :desc, updated_at: :desc)
                  .includes(:interactive)
                  .find { |a| !completed_keys.include?(a.interactive.key) }
    attempt&.interactive
  end

  def determine_layout
    'application'
  end

  def authenticate_user!
    unless current_user&.email_verified?
      redirect_to auth_path, alert: t('auth.flashes.login_required', default: 'Требуется вход в систему')
    end
  end
end
