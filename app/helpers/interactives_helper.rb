module InteractivesHelper
  DEFAULT_INTERACTIVE_APPEAR_CHANCE = 0.60

  def random_pending_interactive(user, interactives, chance: DEFAULT_INTERACTIVE_APPEAR_CHANCE)
    return nil if rand >= chance.to_f

    candidates = Array(interactives).compact.uniq(&:id)
    candidates = Interactive.all.to_a if candidates.empty?
    return nil if candidates.empty?

    completed_keys =
      if user&.persisted?
        user.interactive_completions.pluck(:interactive_key).to_set
      else
        Set.new
      end

    pending = candidates.reject { |i| completed_keys.include?(i.key) }
    pending.sample
  end

  def prepare_interactive_session(user, interactive)
    return nil unless user && interactive
    session = InteractiveSession.new(user: user, interactive: interactive)
    return nil if session.locked?

    already_completed = session.already_completed?
    {
      interactive:       interactive,
      variant:           session.variant,
      already_completed: already_completed,
      attempts_left:     session.attempts_left,
      max_attempts:      session.max_attempts,
      session_token:     (already_completed ? nil : session.attempts_record.issue_session!)
    }
  end
end
