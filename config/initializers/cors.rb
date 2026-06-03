# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins_env  = ENV.fetch('ALLOWED_CORS_ORIGINS', '')
    origins_list = origins_env.split(',').map(&:strip).reject(&:blank?)

    dev_origins = [
      'http://localhost:3000', 'http://127.0.0.1:3000',
      'http://localhost:5173', 'http://127.0.0.1:5173'
    ]

    if origins_list.empty?
      origins(*(Rails.env.development? ? dev_origins : []))
    else
      origins(*origins_list)
    end

    resource '/api/*',
      headers: %w[Authorization Content-Type Accept X-Requested-With],
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      max_age: 86400
  end
end
