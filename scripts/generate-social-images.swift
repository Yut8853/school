import AppKit

// Render the site's existing 0→1 mark and typography into shareable PNG assets.
let ink = NSColor(calibratedRed: 0.055, green: 0.055, blue: 0.063, alpha: 1)
let paper = NSColor(calibratedRed: 0.984, green: 0.980, blue: 0.973, alpha: 1)
let orange = NSColor(calibratedRed: 1, green: 0.29, blue: 0.11, alpha: 1)
func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ color: NSColor = ink, bold: Bool = false) {
    let font = NSFont(name: bold ? "HiraginoSans-W6" : "HiraginoSans-W3", size: size) ?? NSFont.systemFont(ofSize: size)
    (value as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: [.font: font, .foregroundColor: color])
}
func mark(_ x: CGFloat, _ y: CGFloat, _ scale: CGFloat) {
    let p = NSBezierPath(ovalIn: NSRect(x: 3, y: 4, width: 14, height: 20))
    for points: [NSPoint] in [
        [.init(x: 23, y: 14), .init(x: 40, y: 14)],
        [.init(x: 35, y: 8.5), .init(x: 40.5, y: 14), .init(x: 35, y: 19.5)],
        [.init(x: 50, y: 8.5), .init(x: 55, y: 5), .init(x: 55, y: 23)],
        [.init(x: 50.5, y: 23), .init(x: 59, y: 23)]
    ] {
        p.move(to: points[0]); for point in points.dropFirst() { p.line(to: point) }
    }
    let transform = AffineTransform(translationByX: x, byY: y)
    var scaled = transform; scaled.scale(scale)
    p.transform(using: scaled)
    p.lineWidth = 3 * scale; p.lineCapStyle = .round; p.lineJoinStyle = .round
    ink.setStroke(); p.stroke()
}
func render(_ width: Int, _ height: Int, _ file: String, draw: () -> Void) throws {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let context = NSGraphicsContext(bitmapImageRep: bitmap)!.cgContext
    context.translateBy(x: 0, y: CGFloat(height)); context.scaleBy(x: 1, y: -1)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
    paper.setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()
    draw()
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: file))
}
try render(1200, 630, "ogp.png") {
    orange.setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1200, height: 12)).fill()
    mark(64, 56, 2)
    text("Web制作スクール", 216, 65, 31, bold: true)
    text("FROM ZERO TO PRODUCTION", 66, 165, 18, orange, bold: true)
    text("未経験から、", 62, 214, 66, bold: true)
    text("Webプロジェクトを完成させる。", 62, 303, 60, bold: true)
    text("毎月2名限定  /  全32カリキュラム  /  受講期限なし・制作後も質問可", 66, 435, 25)
    ink.withAlphaComponent(0.16).setFill()
    NSBezierPath(rect: NSRect(x: 66, y: 511, width: 1068, height: 1)).fill()
    text("school.junkbranding.com", 66, 547, 23)
    text("JUNKBRANDING", 888, 550, 20, bold: true)
}
try render(512, 512, "logo.png") {
    mark(48, 142, 6.5)
    text("Web制作スクール", 101, 357, 31, bold: true)
}
