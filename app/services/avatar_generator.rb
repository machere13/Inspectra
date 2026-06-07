require 'digest'

module AvatarGenerator
  module_function

  CELLS    = 5
  SIZE     = 280
  PADDING  = 28

  ACCENT_COLORS = %w[
    #00FFC2
    #A8FF00
    #FF6B00
    #FF2EC4
    #00C8FF
    #FFD400
    #A100FF
  ].freeze

  PATTERN_COLOR = '#FAFAFA'
  BG_COLOR      = '#0A0A0A'
  BORDER_COLOR  = '#262626'
  LABEL_COLOR   = '#5A5A5A'

  def call(seed)
    seed_str = seed.to_s
    hash     = Digest::SHA256.hexdigest(seed_str)
    bytes    = hash.scan(/../).map { |h| h.to_i(16) }

    half = (CELLS + 1) / 2
    pattern = Array.new(CELLS) { Array.new(CELLS, false) }

    (0...CELLS).each do |row|
      (0...half).each do |col|
        idx = row * half + col
        on  = (bytes[idx] || 0) >= 128
        pattern[row][col]            = on
        pattern[row][CELLS - 1 - col] = on
      end
    end

    accent_cell_index = (bytes[20] || 0) % (CELLS * CELLS)
    accent_color      = ACCENT_COLORS[(bytes[21] || 0) % ACCENT_COLORS.length]

    label = hash[0, 4].upcase

    cell_size = (SIZE - PADDING * 2) / CELLS.to_f

    rects = []
    pattern.each_with_index do |row, r|
      row.each_with_index do |on, c|
        next unless on
        x = PADDING + c * cell_size
        y = PADDING + r * cell_size
        color =
          if r * CELLS + c == accent_cell_index
            accent_color
          else
            PATTERN_COLOR
          end
        rects << format(
          '<rect x="%.3f" y="%.3f" width="%.3f" height="%.3f" fill="%s" rx="2" />',
          x, y, cell_size - 1.5, cell_size - 1.5, color
        )
      end
    end

    <<~SVG.strip
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 #{SIZE} #{SIZE}" width="#{SIZE}" height="#{SIZE}" role="img" aria-label="Generated avatar">
        <rect width="#{SIZE}" height="#{SIZE}" fill="#{BG_COLOR}" />
        <rect x="0.5" y="0.5" width="#{SIZE - 1}" height="#{SIZE - 1}" fill="none" stroke="#{BORDER_COLOR}" stroke-width="1" />
        #{rects.join("\n        ")}
        <text x="#{SIZE - 10}" y="#{SIZE - 10}" font-family="ui-monospace, 'Geist Mono', 'JetBrains Mono', monospace" font-size="11" fill="#{LABEL_COLOR}" text-anchor="end" letter-spacing="0.05em">0x#{label}</text>
      </svg>
    SVG
  end
end
