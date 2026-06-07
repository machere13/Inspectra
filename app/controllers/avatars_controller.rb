class AvatarsController < ApplicationController
  def show
    user = User.find_by(id: params[:user_id])

    if user&.avatar&.attached?
      redirect_to(url_for(user.avatar), allow_other_host: false) and return
    end

    seed = user ? "inspectra-user-#{user.id}" : "inspectra-anon-#{params[:user_id]}"
    svg  = AvatarGenerator.call(seed)

    response.headers['Cache-Control'] = 'public, max-age=86400'
    render plain: svg, content_type: 'image/svg+xml'
  end
end
