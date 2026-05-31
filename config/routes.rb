Rails.application.routes.draw do
  if defined?(ActiveStorage::Engine)
    mount ActiveStorage::Engine => '/rails/active_storage'
  end
  
  mount Rswag::Ui::Engine => '/api-docs'
  mount Rswag::Api::Engine => '/api-docs'
  
  namespace :api do
    namespace :v1 do
      get 'health', to: 'health#index'
      post 'auth', to: 'auth#login_or_register'
      post 'auth/verify', to: 'auth#verify_email'
      post 'auth/resend', to: 'auth#resend_verification_code'
      get 'auth/me', to: 'auth#me'
      get 'auth/supported-domains', to: 'auth#supported_email_domains'

      get   'profile',              to: 'profile#show'
      patch 'profile/preferences',  to: 'profile#update_preferences'
      patch 'profile/title',        to: 'profile#select_title'
      patch 'profile/name',         to: 'profile#update_name'
      get 'game_roles', to: 'game_roles#index'
      patch 'game_roles/select', to: 'game_roles#select'
      
      resources :achievements, only: [:index] do
        collection do
          get 'my', to: 'achievements#user_achievements'
          get 'by_category', to: 'achievements#by_category'
          post 'test/interactive', to: 'achievements#test_interactive_completion'
          post 'test/consecutive_days', to: 'achievements#test_consecutive_days'
          post 'test/registration', to: 'achievements#test_registration_order'
        end
      end

      resources :weeks, only: [:index, :show] do
        resources :articles, only: [:index, :show]
        resources :content_items, only: [:index]
      end

      post 'auth/password/forgot', to: 'auth#forgot_password'
      post 'auth/password/reset', to: 'auth#reset_password'

      get 'interactive_props/spy', to: 'interactive_props#spy'
      get 'interactive_props/echo', to: 'interactive_props#echo'
      get 'interactive_props/race/fast', to: 'interactive_props#race_fast'
      get 'interactive_props/race/slow', to: 'interactive_props#race_slow'
      get 'interactive_props/ie6_token', to: 'interactive_props#ie6_token'
      get 'interactive_props/profile/:id', to: 'interactive_props#unsecured_profile'
    end

    namespace :v0 do
      get 'echo', to: 'echo#show'
    end
  end

  get 'legacy/iframes/:seed', to: 'legacy_iframes#show', as: 'legacy_iframe'
  get 'legacy/archives/:seed', to: 'legacy_iframes#archive', as: 'legacy_archive'
  get 'legacy/cdn/:filename', to: 'legacy_cdn#show', as: 'legacy_cdn', constraints: { filename: %r{[^/]+} }, format: false

  get 'inspectra', to: 'pages#inspectra'
  post 'inspectra/subscribe', to: 'pages#subscribe', as: :inspectra_subscribe
  get 'profile', to: 'pages#profile'
  get 'profile/config', to: 'pages#profile_config', as: 'profile_config'
  patch 'profile/preferences', to: 'pages#update_preferences', as: 'update_preferences'
  patch 'profile/select_title', to: 'pages#select_title', as: 'select_title'
  patch 'profile/update_name', to: 'pages#update_name', as: 'update_name'
  patch 'profile/update_avatar', to: 'pages#update_avatar', as: 'update_avatar'
  post 'profile/request_password_change', to: 'pages#request_password_change', as: 'request_password_change'
  get 'profile/select_game_role', to: 'pages#select_game_role', as: 'select_game_role'
  patch 'profile/select_game_role', to: 'pages#update_game_role', as: 'update_game_role'

  get 'interactives', to: 'interactives#index', as: 'interactives'
  get 'interactives/:key', to: 'interactives#show', as: 'interactive', constraints: { key: %r{[^/]+} }
  post 'interactives/:key/submit', to: 'interactives#submit', as: 'submit_interactive', constraints: { key: %r{[^/]+} }
  get 'auth', to: redirect('/auth/login')
  delete 'auth/logout', to: 'auth#logout', as: 'logout'
  get 'reset_password', to: 'auth#reset'
  scope :auth do
    get 'login', to: 'auth#login'
    post 'login', to: 'auth#login_submit'
    get 'verify', to: 'auth#verify'
    get 'forgot', to: 'auth#forgot'
    post 'forgot', to: 'auth#forgot_submit'
    get 'reset', to: 'auth#reset'
    post 'reset', to: 'auth#reset_submit'
    post 'verify', to: 'auth#verify_submit'
    post 'resend', to: 'auth#resend'
  end
  
  resources :weeks, only: [:show] do
    member do
      get :og, defaults: { format: :png }
    end
    resources :articles, only: [:show]
  end

  namespace :admin do
    get 'dashboard', to: 'dashboard#index'
    
    resources :users, only: [:index, :show, :edit, :update]
    resources :error_reports, only: [:index]
    resources :media_subscriptions, only: [:index]
    
    resources :weeks do
      resources :articles
      resources :content_items
    end

    resources :jwt_secrets, only: [:index, :create] do
      collection do
        post 'rotate', to: 'jwt_secrets#rotate'
        get 'stats', to: 'jwt_secrets#stats'
      end
    end
  end

  get 'admin', to: redirect('/admin/dashboard')

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
  root 'pages#home'

  post 'report_problem', to: 'errors#report_problem', as: :report_problem

  match '/403', to: 'errors#show', defaults: { status_code: 403 }, via: :all
  match '/404', to: 'errors#show', defaults: { status_code: 404 }, via: :all
  match '/418', to: 'errors#show', defaults: { status_code: 418 }, via: :all
  match '/422', to: 'errors#show', defaults: { status_code: 422 }, via: :all
  match '/429', to: 'errors#show', defaults: { status_code: 429 }, via: :all
  match '/500', to: 'errors#show', defaults: { status_code: 500 }, via: :all
  match '/502', to: 'errors#show', defaults: { status_code: 502 }, via: :all
  match '/503', to: 'errors#show', defaults: { status_code: 503 }, via: :all

  # Catch-all for non-existent routes (must be last)
  match '*unmatched', to: 'errors#not_found', via: :all, constraints: lambda { |req| !req.path.start_with?('/rails/active_storage') }

end
