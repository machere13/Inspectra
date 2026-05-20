# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_05_20_120000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "achievements", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.string "category"
    t.string "progress_type"
    t.integer "progress_target"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "title_id"
    t.string "reward_theme"
    t.string "reward_badge_label"
    t.index ["title_id"], name: "index_achievements_on_title_id"
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "articles", force: :cascade do |t|
    t.bigint "week_id", null: false
    t.string "title"
    t.text "body"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.string "tags", default: [], null: false, array: true
    t.index ["week_id"], name: "index_articles_on_week_id"
  end

  create_table "content_items", force: :cascade do |t|
    t.bigint "week_id", null: false
    t.bigint "article_id"
    t.string "kind"
    t.string "title"
    t.text "body"
    t.string "url"
    t.integer "position"
    t.jsonb "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_id"], name: "index_content_items_on_article_id"
    t.index ["kind"], name: "index_content_items_on_kind"
    t.index ["week_id", "position"], name: "index_content_items_on_week_id_and_position"
    t.index ["week_id"], name: "index_content_items_on_week_id"
  end

  create_table "error_reports", force: :cascade do |t|
    t.string "page_url"
    t.string "status_code"
    t.string "reporter_email"
    t.text "message", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_error_reports_on_created_at"
    t.index ["status_code"], name: "index_error_reports_on_status_code"
  end

  create_table "interactive_attempts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "interactive_id", null: false
    t.integer "count", default: 0, null: false
    t.datetime "last_attempt_at"
    t.datetime "locked_until"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "session_token"
    t.datetime "session_expires_at"
    t.index ["interactive_id"], name: "index_interactive_attempts_on_interactive_id"
    t.index ["locked_until"], name: "index_interactive_attempts_on_locked_until"
    t.index ["session_token"], name: "index_interactive_attempts_on_session_token", unique: true
    t.index ["user_id", "interactive_id"], name: "index_interactive_attempts_on_user_id_and_interactive_id", unique: true
    t.index ["user_id"], name: "index_interactive_attempts_on_user_id"
  end

  create_table "interactive_completions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "article_id"
    t.string "interactive_key", null: false
    t.string "category", null: false
    t.datetime "completed_at", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "interactive_id"
    t.bigint "interactive_variant_id"
    t.index ["article_id"], name: "index_interactive_completions_on_article_id"
    t.index ["interactive_id"], name: "index_interactive_completions_on_interactive_id"
    t.index ["interactive_variant_id"], name: "index_interactive_completions_on_interactive_variant_id"
    t.index ["user_id", "article_id", "interactive_key"], name: "index_interactive_completions_uniqueness", unique: true
    t.index ["user_id"], name: "index_interactive_completions_on_user_id"
  end

  create_table "interactive_variants", force: :cascade do |t|
    t.bigint "interactive_id", null: false
    t.integer "seed", null: false
    t.jsonb "payload", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["interactive_id", "seed"], name: "index_interactive_variants_on_interactive_id_and_seed", unique: true
    t.index ["interactive_id"], name: "index_interactive_variants_on_interactive_id"
  end

  create_table "interactives", force: :cascade do |t|
    t.string "key", null: false
    t.string "category", null: false
    t.string "kind", null: false
    t.string "title", null: false
    t.text "description"
    t.integer "xp_reward", default: 50, null: false
    t.integer "difficulty", default: 1, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "article_id"
    t.index ["article_id"], name: "index_interactives_on_article_id"
    t.index ["category"], name: "index_interactives_on_category"
    t.index ["key"], name: "index_interactives_on_key", unique: true
    t.index ["kind"], name: "index_interactives_on_kind"
  end

  create_table "jwt_secret_rotations", force: :cascade do |t|
    t.datetime "rotated_at", null: false
    t.string "rotated_by", null: false
    t.string "rotation_type", null: false
    t.text "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["rotated_at"], name: "index_jwt_secret_rotations_on_rotated_at"
    t.index ["rotation_type"], name: "index_jwt_secret_rotations_on_rotation_type"
  end

  create_table "levels", force: :cascade do |t|
    t.integer "number", null: false
    t.integer "required_xp", default: 0, null: false
    t.string "name", null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["number"], name: "index_levels_on_number", unique: true
    t.index ["required_xp"], name: "index_levels_on_required_xp"
  end

  create_table "media_subscriptions", force: :cascade do |t|
    t.string "email", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_media_subscriptions_on_email", unique: true
  end

  create_table "revoked_tokens", force: :cascade do |t|
    t.string "jti"
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_revoked_tokens_on_jti", unique: true
  end

  create_table "titles", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_titles_on_name", unique: true
  end

  create_table "user_achievements", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "achievement_id", null: false
    t.integer "progress"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["achievement_id"], name: "index_user_achievements_on_achievement_id"
    t.index ["user_id"], name: "index_user_achievements_on_user_id"
  end

  create_table "user_titles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "title_id", null: false
    t.datetime "earned_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["title_id"], name: "index_user_titles_on_title_id"
    t.index ["user_id", "title_id"], name: "index_user_titles_on_user_id_and_title_id", unique: true
    t.index ["user_id"], name: "index_user_titles_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "email_verified", default: false
    t.string "verification_code"
    t.datetime "verification_code_expires_at"
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "reset_password_requested_at"
    t.boolean "admin", default: false, null: false
    t.integer "role", default: 0, null: false
    t.bigint "current_title_id"
    t.string "name"
    t.string "avatar"
    t.integer "game_role"
    t.datetime "game_role_selected_at"
    t.integer "experience_points", default: 0, null: false
    t.integer "current_streak_days", default: 0, null: false
    t.integer "longest_streak_days", default: 0, null: false
    t.date "last_content_view_on"
    t.datetime "platform_lifetime_marked_at"
    t.datetime "last_day_witnessed_at"
    t.string "theme", default: "dark", null: false
    t.boolean "notifications_email", default: true, null: false
    t.index ["admin"], name: "index_users_on_admin"
    t.index ["current_title_id"], name: "index_users_on_current_title_id"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["game_role"], name: "index_users_on_game_role"
    t.index ["last_content_view_on"], name: "index_users_on_last_content_view_on"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["role"], name: "index_users_on_role"
  end

  create_table "weeks", force: :cascade do |t|
    t.integer "number"
    t.string "title"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "published_at", null: false
    t.datetime "expires_at", null: false
    t.index ["expires_at"], name: "index_weeks_on_expires_at"
    t.index ["number"], name: "index_weeks_on_number", unique: true
    t.index ["published_at", "expires_at"], name: "index_weeks_on_published_at_and_expires_at"
    t.index ["published_at"], name: "index_weeks_on_published_at"
  end

  add_foreign_key "achievements", "titles"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "articles", "weeks"
  add_foreign_key "content_items", "articles"
  add_foreign_key "content_items", "weeks"
  add_foreign_key "interactive_attempts", "interactives"
  add_foreign_key "interactive_attempts", "users"
  add_foreign_key "interactive_completions", "articles"
  add_foreign_key "interactive_completions", "interactive_variants"
  add_foreign_key "interactive_completions", "interactives"
  add_foreign_key "interactive_completions", "users"
  add_foreign_key "interactive_variants", "interactives"
  add_foreign_key "interactives", "articles"
  add_foreign_key "user_achievements", "achievements"
  add_foreign_key "user_achievements", "users"
  add_foreign_key "user_titles", "titles"
  add_foreign_key "user_titles", "users"
  add_foreign_key "users", "titles", column: "current_title_id"
end
