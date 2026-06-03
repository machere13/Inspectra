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
end
