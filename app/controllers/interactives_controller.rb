class InteractivesController < WebController
  before_action :authenticate_user!
  before_action :load_interactive

  def submit
    session = InteractiveSession.new(user: current_user, interactive: @interactive)
    result = session.submit(params[:answer])

    fallback = request.referer.presence || root_path

    if result.success?
      xp = result.completion.metadata['xp_awarded']
      messages = [t('pages.interactive.completed', xp: xp)]
      Array(result.new_titles).each do |title|
        messages << t('pages.profile.titles.earned_toast', title: title.name)
      end
      redirect_to fallback, notice: messages.join(' · ')
    elsif result.locked
      redirect_to fallback, alert: result.error_message
    else
      redirect_to fallback, alert: result.error_message
    end
  end

  private

  def load_interactive
    @interactive = Interactive.find_by!(key: params[:key])
  rescue ActiveRecord::RecordNotFound
    redirect_to root_path, alert: t('pages.interactive.not_found')
  end

  def authenticate_user!
    unless current_user&.email_verified?
      redirect_to auth_path, alert: t('auth.flashes.login_required', default: 'Требуется вход в систему')
    end
  end
end
