class Api::V1::ProfileController < ApplicationController
  include JwtHelper

  before_action :require_auth

  def show
    user  = current_user
    level = user.level
    next_level = user.next_level

    render_success(data: {
      user: {
        id:                 user.id,
        email:              user.email,
        name:               user.name,
        avatar_url:         user.avatar.attached? ? Rails.application.routes.url_helpers.url_for(user.avatar) : Rails.application.routes.url_helpers.generated_avatar_url(user.id, format: :svg, host: request.base_url),
        game_role:          user.game_role,
        game_role_label:    user.game_role_label,
        game_role_required: user.game_role_required?,
        theme:              user.theme || 'dark',
        notifications_email: user.notifications_email,
        experience_points:  user.experience_points
      },
      progress: {
        level: level && { number: level.number, name: level.name, required_xp: level.required_xp },
        next_level: next_level && { number: next_level.number, name: next_level.name, required_xp: next_level.required_xp },
        level_progress_percent: user.level_progress_percent
      },
      skill_chart: build_skill_chart(user),
      achievements: build_achievement_groups_for_api(user),
      titles: {
        current: user.current_title&.then { |t| { id: t.id, name: t.name, description: t.description } },
        available: user.available_titles.map { |t| { id: t.id, name: t.name, description: t.description } }
      },
      themes: {
        current: user.theme || 'dark',
        all: User::ALLOWED_THEMES,
        unlocked: user.unlocked_themes,
        catalog: theme_catalog(user)
      },
      badges: user.earned_badges.map { |b| { label: b[:label], achievement_name: b[:achievement].name } }
    })
  end

  def update_preferences
    user  = current_user
    attrs = {}

    if params[:theme].present?
      if User::ALLOWED_THEMES.include?(params[:theme]) && user.theme_unlocked?(params[:theme])
        attrs[:theme] = params[:theme]
      else
        return render_validation_error(message: 'Тема недоступна или заблокирована')
      end
    end

    unless params[:notifications_email].nil?
      attrs[:notifications_email] = ActiveModel::Type::Boolean.new.cast(params[:notifications_email])
    end

    if attrs.empty?
      return render_validation_error(message: 'Нет изменений')
    end

    if user.update(attrs)
      render_success(data: { theme: user.theme, notifications_email: user.notifications_email })
    else
      render_validation_error(message: user.errors.full_messages.join(', '))
    end
  end

  def select_title
    user  = current_user
    title = Title.find_by(id: params[:title_id])
    return render_not_found(message: 'Титул не найден') unless title

    begin
      user.select_title!(title)
      render_success(data: { current_title: { id: title.id, name: title.name } })
    rescue ArgumentError
      render_validation_error(message: 'Титул недоступен для пользователя')
    end
  end

  def update_name
    user = current_user
    if user.update(name: params[:name])
      render_success(data: { name: user.name })
    else
      render_validation_error(message: user.errors.full_messages.join(', '))
    end
  end

  private

  def build_skill_chart(user)
    totals_by_category = Interactive.group(:category).count
    done_by_category   = user.interactive_completions.group(:category).count
    categories         = Interactive::CATEGORIES
    overall_total      = totals_by_category.values.sum
    overall_done       = done_by_category.values.sum

    rows = categories.map do |cat|
      total   = totals_by_category[cat].to_i
      done    = done_by_category[cat].to_i
      percent = total.zero? ? 0 : ((done.to_f / total) * 100).round
      { key: cat, label: I18n.t("achievement_categories.#{cat}", default: cat.titleize), percent:, done:, total: }
    end
    overall_percent = overall_total.zero? ? 0 : ((overall_done.to_f / overall_total) * 100).round
    rows << { key: 'overall', label: I18n.t('pages.profile.skill_chart.overall', default: 'Общий'), percent: overall_percent, done: overall_done, total: overall_total }
    rows
  end

  def build_achievement_groups_for_api(user)
    user_progress = user.user_achievements.includes(:achievement).index_by(&:achievement_id)

    Achievement.all.group_by { |a| [a.category, a.progress_type] }.flat_map do |(category, _pt), group|
      sorted  = group.sort_by(&:progress_target)
      targets = sorted.map(&:progress_target)

      if sorted.size > 1 && targets.uniq.size == targets.size
        completed_count = sorted.count { |a| user_progress[a.id]&.completed? }
        next_tier       = sorted.find { |a| !user_progress[a.id]&.completed? }
        display         = next_tier || sorted.last
        progress        = sorted.map { |a| user_progress[a.id]&.progress.to_i }.max.to_i
        all_completed   = next_tier.nil?
        [{
          key: "#{category}_#{display.progress_type}_chain",
          category: category,
          name: display.name,
          description: display.description,
          progress: all_completed ? display.progress_target : [progress, display.progress_target].min,
          target: display.progress_target,
          tiers_total: sorted.size,
          tiers_completed: completed_count,
          all_completed: all_completed
        }]
      else
        sorted.map do |a|
          ua = user_progress[a.id]
          completed = ua&.completed? || false
          {
            key: "#{category}_#{a.id}",
            category: category,
            name: a.name,
            description: a.description,
            progress: completed ? a.progress_target : [ua&.progress.to_i, a.progress_target].min,
            target: a.progress_target,
            tiers_total: 1,
            tiers_completed: completed ? 1 : 0,
            all_completed: completed
          }
        end
      end
    end
  end

  def theme_catalog(user)
    unlocked = user.unlocked_themes
    unlock_by = Achievement.where.not(reward_theme: nil).index_by(&:reward_theme)

    User::ALLOWED_THEMES.map do |t_key|
      ach = unlock_by[t_key]
      {
        key: t_key,
        unlocked: unlocked.include?(t_key),
        unlock_via: ach && { achievement_name: ach.name, description: ach.description }
      }
    end
  end
end
