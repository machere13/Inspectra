class RemoveVkFromUsers < ActiveRecord::Migration[8.0]
  def change
    if index_exists?(:users, :vk_user_id)
      remove_index :users, :vk_user_id
    end

    remove_column :users, :vk_user_id,    :bigint  if column_exists?(:users, :vk_user_id)
    remove_column :users, :vk_first_name, :string  if column_exists?(:users, :vk_first_name)
    remove_column :users, :vk_last_name,  :string  if column_exists?(:users, :vk_last_name)
    remove_column :users, :vk_avatar_url, :string  if column_exists?(:users, :vk_avatar_url)
  end
end
