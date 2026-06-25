threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
threads threads_count, threads_count

port ENV.fetch("PORT", 3000)

workers_count = ENV.fetch("WEB_CONCURRENCY", 2).to_i

if workers_count > 0 && !Gem.win_platform?
  workers workers_count

  preload_app!

  worker_timeout Integer(ENV.fetch("PUMA_WORKER_TIMEOUT", 60))

  worker_shutdown_timeout Integer(ENV.fetch("PUMA_WORKER_SHUTDOWN_TIMEOUT", 25))

  before_fork do
    if defined?(ActiveRecord::Base)
      ActiveRecord::Base.connection_handler.connection_pool_list(:writing).each(&:disconnect!)
    end
  end

  on_worker_boot do
    if defined?(ActiveRecord::Base)
      ActiveRecord::Base.establish_connection
    end
  end

  on_worker_shutdown do
    if defined?(ActiveRecord::Base)
      ActiveRecord::Base.connection_handler.connection_pool_list(:writing).each(&:disconnect!)
    end
  end
end

plugin :tmp_restart

pidfile ENV["PIDFILE"] if ENV["PIDFILE"]
