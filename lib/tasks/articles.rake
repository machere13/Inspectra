namespace :articles do
  desc 'Импортировать статью из .md-файла в неделю. ' \
       'Использование: rake "articles:import[docs/articles/web-rassledovanie-devtools.md,1]"'
  task :import, %i[path week_number] => :environment do |_t, args|
    require 'yaml'

    path = args[:path]
    week_number = args[:week_number].to_i

    if path.blank? || week_number <= 0
      puts 'Использование: rake "articles:import[ПУТЬ_К_MD,НОМЕР_НЕДЕЛИ]"'
      next
    end

    file = Rails.root.join(path)
    unless File.exist?(file)
      puts "Файл не найден: #{file}"
      next
    end

    week = Week.find_by(number: week_number)
    if week.nil?
      puts "Неделя #{week_number} не найдена. Создайте её (или запустите rake weeks:create_missing)."
      next
    end

    raw = File.read(file)

    meta = {}
    body = raw
    if (m = raw.match(/\A---\s*\n(.*?)\n---\s*\n?(.*)\z/m))
      meta = YAML.safe_load(m[1]) || {}
      body = m[2]
    end

    title = meta['title'].presence || File.basename(file, '.md')
    description = meta['subtitle'].presence || meta['description'].presence
    tags = Array(meta['tags']).join(', ')

    article = Article.find_or_initialize_by(week: week, title: title)
    article.body = body.strip
    article.description = description if description
    article.tag_list = tags if tags.present?

    if article.save
      action = article.previously_new_record? ? 'Создана' : 'Обновлена'
      puts "#{action} статья «#{title}» в неделе #{week_number} (id=#{article.id})."
    else
      puts "Не удалось сохранить статью: #{article.errors.full_messages.join('; ')}"
    end
  end
end
