class Api::V1::AuthController < ApplicationController
  include JwtHelper

  def login_or_register
    email = params[:email]
    password = params[:password]

    if email.blank? || password.blank?
      return render_validation_error(message: 'Email и пароль обязательны')
    end

    user = User.find_by(email: email)

    if user
      if user.authenticate(password)
        user.generate_verification_code!
        VerificationMailer.send_verification_code(user).deliver_later
        
        render_success(
          data: {
            requires_verification: true,
            email: user.email
          },
          message: 'Код подтверждения отправлен на email'
        )
      else
        render_unauthorized(message: 'Неверный пароль')
      end
    else
      user = User.new(email: email, password: password)
      
      if user.save
        user.generate_verification_code!
        VerificationMailer.send_verification_code(user).deliver_later
        
        render_success(
          data: {
            requires_verification: true,
            email: user.email
          },
          message: 'Пользователь зарегистрирован. Проверьте email для подтверждения.',
          status: :created
        )
      else
        render_error(
          code: ERROR_CODES[:validation_error],
          message: 'Ошибка регистрации',
          details: user.errors.full_messages,
          status: :unprocessable_entity
        )
      end
    end
  end

  def verify_email
    email = params[:email]
    code = params[:code]

    if email.blank? || code.blank?
      return render_validation_error(message: 'Email и код обязательны')
    end

    user = User.find_by(email: email)
    
    unless user
      return render_not_found(message: 'Пользователь не найден')
    end

    if user.verification_code_valid?(code)
      user.verify_email!
      token = encode_token({ user_id: user.id })

      render_success(
        data: {
          token: token,
          user: {
            id: user.id,
            email: user.email,
            game_role: user.game_role,
            game_role_required: user.game_role_required?
          }
        },
        message: 'Email успешно подтвержден'
      )
    else
      render_unauthorized(message: 'Неверный или истекший код')
    end
  end

  def resend_verification_code
    email = params[:email]

    if email.blank?
      return render_validation_error(message: 'Email обязателен')
    end

    user = User.find_by(email: email)
    
    unless user
      return render_not_found(message: 'Пользователь не найден')
    end

    if user.email_verified?
      return render_validation_error(message: 'Email уже подтвержден')
    end

    user.generate_verification_code!
    VerificationMailer.send_verification_code(user).deliver_later

    render_success(message: 'Код подтверждения отправлен повторно')
  end

  before_action :require_auth, only: [:me]

  def me
    level = current_user.level
    next_level = current_user.next_level

    render_success(
      data: {
        user: {
          id: current_user.id,
          email: current_user.email,
          name: current_user.name,
          game_role: current_user.game_role,
          game_role_selected_at: current_user.game_role_selected_at,
          game_role_required: current_user.game_role_required?,
          specialty_category: current_user.specialty_category,
          experience_points: current_user.experience_points,
          level: level && {
            number: level.number,
            name: level.name,
            required_xp: level.required_xp
          },
          next_level: next_level && {
            number: next_level.number,
            name: next_level.name,
            required_xp: next_level.required_xp,
            xp_remaining: current_user.xp_remaining_to_next_level
          },
          level_progress_percent: current_user.level_progress_percent
        }
      }
    )
  end

  def supported_email_domains
    render_success(
      data: {
        supported_domains: SmtpConfigService.supported_domains
      },
      message: 'Поддерживаемые почтовые домены для регистрации'
    )
  end

  def forgot_password
    email = params[:email]
    return render_validation_error(message: 'Email обязателен') if email.blank?

    user = User.find_by(email: email)
    if user
      if user.reset_password_requested_at && user.reset_password_requested_at > AppConfig::Auth.resend_code_cooldown_seconds.ago
        return render_too_many_requests(message: 'Письмо уже отправлено, попробуйте позже')
      end

      user.generate_reset_password_token!
      ResetPasswordMailer.with(user: user).reset_instructions.deliver_later
    end

    render_success(message: 'Если email существует, мы отправили ссылку для сброса')
  end

  def reset_password
    token = params[:token]
    password = params[:password]
    password_confirmation = params[:password_confirmation]

    if token.blank? || password.blank? || password_confirmation.blank?
      return render_validation_error(message: 'Токен и пароли обязательны')
    end

    if password.length < 8 || password.length > 64
      return render_error(
        code: ERROR_CODES[:validation_error],
        message: 'Пароль должен быть от 8 до 64 символов',
        status: :unprocessable_entity
      )
    end

    user = User.find_by(reset_password_token: token)
    return render_unauthorized(message: 'Неверный токен') unless user
    return render_unauthorized(message: 'Ссылка истекла') unless user.reset_token_valid?

    user.password = password
    user.password_confirmation = password_confirmation
    if user.save
      user.clear_reset_password_token!
      token_jwt = encode_token({ user_id: user.id })
      render_success(
        data: { token: token_jwt },
        message: 'Пароль обновлён'
      )
    else
      render_error(
        code: ERROR_CODES[:validation_error],
        message: 'Не удалось обновить пароль',
        details: user.errors.full_messages,
        status: :unprocessable_entity
      )
    end
  end

end
