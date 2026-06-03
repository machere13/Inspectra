class AddRewardsToAchievements < ActiveRecord::Migration[8.0]
  def change
    add_column :achievements, :reward_theme, :string
    add_column :achievements, :reward_badge_label, :string
  end
end
