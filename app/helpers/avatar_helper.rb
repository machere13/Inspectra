module AvatarHelper
  def avatar_url_for(user)
    return generated_avatar_path(0) unless user
    return url_for(user.avatar) if user.avatar.attached?
    generated_avatar_path(user.id)
  end
end
