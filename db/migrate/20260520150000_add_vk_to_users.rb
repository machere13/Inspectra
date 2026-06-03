class AddVkToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :vk_user_id,     :bigint
    add_column :users, :vk_first_name,  :string
    add_column :users, :vk_last_name,   :string
    add_column :users, :vk_avatar_url,  :string

    add_index  :users, :vk_user_id, unique: true, where: 'vk_user_id IS NOT NULL'

    # email становится опциональным для VK-юзеров — БД-уровень не меняем (валидации в модели),
    # но если есть колоночное NOT NULL ограничение — снимаем.
    change_column_null :users, :email, true if column_exists?(:users, :email) && !ActiveRecord::Base.connection.columns(:users).find { |c| c.name == 'email' }.null
  end
end
