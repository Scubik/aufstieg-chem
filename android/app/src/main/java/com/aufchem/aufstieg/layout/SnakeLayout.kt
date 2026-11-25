package com.aufchem.aufstieg.layout

import com.aufchem.aufstieg.data.ChemBitmap
import com.aufchem.aufstieg.data.SequenceModel
import com.aufchem.aufstieg.data.StepModel
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

data class SnakeLayoutConfig(
    val gapMin: Float,
    val gapPad: Float,
    val rowVgapMin: Float,
    val arrowInset: Float,
    val blockPad: Float,
    val turnSideGap: Float,
    val turnBlobPad: Float,
    val margin: Float,
    val labelVgap: Float,
    val optimizeA4: Boolean,
)

val SCREEN_SNAKE_CONFIG = SnakeLayoutConfig(
    gapMin = 260f,
    gapPad = 120f,
    rowVgapMin = 210f,
    arrowInset = 18f,
    blockPad = 24f,
    turnSideGap = 64f,
    turnBlobPad = 80f,
    margin = 80f,
    labelVgap = 18f,
    optimizeA4 = false,
)

val PDF_SNAKE_CONFIG = SnakeLayoutConfig(
    gapMin = 165f,
    gapPad = 96f,
    rowVgapMin = 120f,
    arrowInset = 14f,
    blockPad = 24f,
    turnSideGap = 38f,
    turnBlobPad = 36f,
    margin = 16f,
    labelVgap = 14f,
    optimizeA4 = true,
)

data class LayoutNode(
    val index: Int,
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val bitmap: ChemBitmap,
    val hiddenByDefault: Boolean,
    val stageNumber: Int,
)

data class LayoutLabel(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val bitmap: ChemBitmap,
    val stepIndex: Int,
)

data class LayoutArrow(
    val x1: Float,
    val y1: Float,
    val x2: Float,
    val y2: Float,
    val stepIndex: Int,
)

data class SnakeBoard(
    val width: Float,
    val height: Float,
    val nodes: List<LayoutNode>,
    val labels: List<LayoutLabel>,
    val arrows: List<LayoutArrow>,
)

object SnakeLayoutEngine {
    private const val ROW_STEPS = 5.0
    private const val ROW_TARGET = 10000f
    const val A4_PAGE_W = 1106f
    const val A4_PAGE_H = 771f
    const val A4_PAGE_H_CIT = 720f

    private fun gapFor(step: StepModel, cfg: SnakeLayoutConfig): Float {
        var w = cfg.gapMin
        step.reaction.reagent?.let { w = max(w, it.width + cfg.gapPad) }
        step.reaction.conditions?.let { w = max(w, it.width + cfg.gapPad) }
        return w
    }

    private fun partitionRows(
        steps: List<StepModel>,
        kInput: Int,
        cfg: SnakeLayoutConfig,
    ): List<Pair<Int, Int>> {
        val n = steps.size
        if (n == 0) return listOf(0 to -1)
        val k = kInput.coerceIn(1, n)

        val nodeW = FloatArray(n + 1)
        nodeW[0] = steps[0].substrate.width.toFloat()
        for (i in 0 until n) nodeW[i + 1] = steps[i].product.width.toFloat()

        val gaps = FloatArray(n) { gapFor(steps[it], cfg) }
        val pn = FloatArray(n + 2)
        for (i in 0..n) pn[i + 1] = pn[i] + nodeW[i]
        val pg = FloatArray(n + 1)
        for (i in 0 until n) pg[i + 1] = pg[i] + gaps[i]

        fun rowWR0(a: Int, b: Int): Float = (pn[b + 2] - pn[a]) + (pg[b + 1] - pg[a])
        fun rowWRn(a: Int, b: Int): Float {
            if (!cfg.optimizeA4) return rowWR0(a, b)
            if (a == b) return pn[a + 2] - pn[a + 1]
            return (pn[b + 2] - pn[a + 1]) + (pg[b + 1] - pg[a + 1])
        }

        val dp = Array(k + 1) { FloatArray(n + 1) { Float.POSITIVE_INFINITY } }
        val cut = Array(k + 1) { IntArray(n + 1) { -1 } }
        dp[0][0] = 0f

        for (j in 1..k) {
            for (i in j..n) {
                for (t in (j - 1) until i) {
                    val prev = dp[j - 1][t]
                    if (prev.isInfinite()) continue
                    val rw = if (j == 1) rowWR0(t, i - 1) else rowWRn(t, i - 1)
                    val v = max(prev, rw)
                    if (v < dp[j][i]) {
                        dp[j][i] = v
                        cut[j][i] = t
                    }
                }
            }
        }

        val rows = ArrayList<Pair<Int, Int>>(k)
        var i = n
        var rem = k
        while (rem > 0) {
            val t = cut[rem][i]
            rows.add(t to (i - 1))
            i = t
            rem--
        }
        rows.reverse()
        return rows
    }

    private data class RawLayout(
        val posX: FloatArray,
        val posY: FloatArray,
        val arrows: List<LayoutArrow>,
        val labels: List<LayoutLabel>,
    )

    private fun layoutForRows(
        steps: List<StepModel>,
        rows: List<Pair<Int, Int>>,
        cfg: SnakeLayoutConfig,
    ): RawLayout {
        val nNodes = steps.size + 1
        val posX = FloatArray(nNodes)
        val posY = FloatArray(nNodes)
        val rowOfNode = IntArray(nNodes)

        val (a0, b0) = rows[0]
        posX[0] = 0f
        for (i in a0..b0) {
            val gap = gapFor(steps[i], cfg)
            posX[i + 1] = posX[i] + steps[i].substrate.width + gap
            rowOfNode[i + 1] = 0
        }

        for (r in 1 until rows.size) {
            val (a, b) = rows[r]
            val s = a
            val dir = if (r % 2 == 1) -1 else 1
            val cx = posX[s] + steps[s - 1].product.width / 2f
            val wNext = if (cfg.optimizeA4) steps[s].product.width else steps[s].substrate.width
            posX[s + 1] = cx - wNext / 2f
            rowOfNode[s + 1] = r
            for (i in (s + 1)..b) {
                val gap = gapFor(steps[i], cfg)
                posX[i + 1] = if (dir > 0) {
                    posX[i] + steps[i].substrate.width + gap
                } else {
                    posX[i] - gap - steps[i].product.width
                }
                rowOfNode[i + 1] = r
            }
        }

        fun nodeH(idx: Int): Float =
            if (idx > 0) steps[idx - 1].product.height.toFloat() else steps[0].substrate.height.toFloat()

        val topExt = FloatArray(rows.size)
        val botExt = FloatArray(rows.size)
        for (r in rows.indices) {
            val (a, b) = rows[r]
            val startNode = if (r == 0) a else a + 1
            var t = 0f
            for (n in startNode..(b + 1)) t = max(t, nodeH(n) / 2f)
            var btm = t
            val startStep = if (r == 0) a else a + 1
            for (i in startStep..b) {
                steps[i].reaction.reagent?.let { t = max(t, it.height + cfg.blockPad) }
                steps[i].reaction.conditions?.let { btm = max(btm, it.height + cfg.blockPad) }
            }
            topExt[r] = t
            botExt[r] = btm
        }

        val mid = FloatArray(rows.size)
        mid[0] = topExt[0]
        for (r in 1 until rows.size) {
            val s = rows[r].first
            val bottomOfS = mid[r - 1] + nodeH(s) / 2f
            val turn = steps[s]
            var blobH = 0f
            turn.reaction.reagent?.let { blobH += it.height + cfg.labelVgap }
            turn.reaction.conditions?.let { blobH += it.height + cfg.labelVgap }
            val vgap = max(cfg.rowVgapMin, blobH + cfg.turnBlobPad)
            val rowTop = bottomOfS + vgap
            mid[r] = if (cfg.optimizeA4) {
                val minDist = botExt[r - 1] + topExt[r] + 28f
                max(mid[r - 1] + minDist, rowTop + topExt[r])
            } else {
                rowTop + topExt[r]
            }
        }

        for (i in 0 until nNodes) {
            posY[i] = mid[rowOfNode[i]] - nodeH(i) / 2f
        }

        val arrows = ArrayList<LayoutArrow>(steps.size)
        val labels = ArrayList<LayoutLabel>(steps.size * 2)

        for (r in rows.indices) {
            val (a, b) = rows[r]
            val dir = if (r == 0) 1 else if (r % 2 == 1) -1 else 1
            val startStep = if (r == 0) a else a + 1
            for (i in startStep..b) {
                val x1: Float
                val x2: Float
                if (dir > 0) {
                    x1 = posX[i] + steps[i].substrate.width + cfg.arrowInset
                    x2 = posX[i + 1] - cfg.arrowInset
                } else {
                    x1 = posX[i] - cfg.arrowInset
                    x2 = posX[i + 1] + steps[i].product.width + cfg.arrowInset
                }
                val y = mid[r]
                arrows.add(LayoutArrow(x1, y, x2, y, i))
                val cx = (x1 + x2) / 2f
                steps[i].reaction.reagent?.let { img ->
                    labels.add(LayoutLabel(cx - img.width / 2f, y - cfg.blockPad - img.height, img.width.toFloat(), img.height.toFloat(), img, i))
                }
                steps[i].reaction.conditions?.let { img ->
                    labels.add(LayoutLabel(cx - img.width / 2f, y + cfg.blockPad, img.width.toFloat(), img.height.toFloat(), img, i))
                }
            }

            if (r > 0) {
                val s = a
                val cx = posX[s] + steps[s - 1].product.width / 2f
                val y1 = mid[r - 1] + nodeH(s) / 2f + cfg.arrowInset
                val y2 = posY[s + 1] - cfg.arrowInset
                arrows.add(LayoutArrow(cx, y1, cx, y2, s))

                val parts = listOfNotNull(steps[s].reaction.reagent, steps[s].reaction.conditions)
                if (parts.isNotEmpty()) {
                    val w = parts.maxOf { it.width }.toFloat()
                    val h = parts.sumOf { it.height }.toFloat() + cfg.labelVgap * (parts.size - 1)
                    val turnDir = if (r % 2 == 1) -1 else 1
                    val x = if (turnDir > 0) cx - cfg.turnSideGap - w else cx + cfg.turnSideGap
                    var y = (y1 + y2) / 2f - h / 2f
                    for (p in parts) {
                        labels.add(LayoutLabel(x + (w - p.width) / 2f, y, p.width.toFloat(), p.height.toFloat(), p, s))
                        y += p.height + cfg.labelVgap
                    }
                }
            }
        }

        return RawLayout(posX, posY, arrows, labels)
    }

    private fun bboxSize(steps: List<StepModel>, raw: RawLayout, margin: Float): Pair<Float, Float> {
        var minX = Float.POSITIVE_INFINITY
        var minY = Float.POSITIVE_INFINITY
        var maxX = Float.NEGATIVE_INFINITY
        var maxY = Float.NEGATIVE_INFINITY

        for (i in 0..steps.size) {
            val bmp = if (i > 0) steps[i - 1].product else steps[0].substrate
            minX = min(minX, raw.posX[i])
            minY = min(minY, raw.posY[i])
            maxX = max(maxX, raw.posX[i] + bmp.width)
            maxY = max(maxY, raw.posY[i] + bmp.height)
        }
        for (l in raw.labels) {
            minX = min(minX, l.x)
            minY = min(minY, l.y)
            maxX = max(maxX, l.x + l.width)
            maxY = max(maxY, l.y + l.height)
        }
        for (a in raw.arrows) {
            minX = min(minX, min(a.x1, a.x2))
            minY = min(minY, min(a.y1, a.y2))
            maxX = max(maxX, max(a.x1, a.x2))
            maxY = max(maxY, max(a.y1, a.y2))
        }
        return (maxX - minX + 2f * margin) to (maxY - minY + 2f * margin)
    }

    fun build(
        sequence: SequenceModel,
        cfg: SnakeLayoutConfig = SCREEN_SNAKE_CONFIG,
        pageW: Float = A4_PAGE_W,
        pageH: Float = A4_PAGE_H,
    ): SnakeBoard {
        val steps = sequence.steps
        if (steps.isEmpty()) {
            val start = sequence.start
            return if (start != null) {
                SnakeBoard(
                    width = start.width + 2 * cfg.margin,
                    height = start.height + 2 * cfg.margin,
                    nodes = listOf(
                        LayoutNode(0, cfg.margin, cfg.margin, start.width.toFloat(), start.height.toFloat(), start, false, 0)
                    ),
                    labels = emptyList(),
                    arrows = emptyList(),
                )
            } else {
                SnakeBoard(100f, 100f, emptyList(), emptyList(), emptyList())
            }
        }

        val raw: RawLayout = if (!cfg.optimizeA4) {
            val total = steps.sumOf { (it.substrate.width + gapFor(it, cfg)).toDouble() }.toFloat() +
                steps.last().product.width
            var k = (steps.size / ROW_STEPS).roundToInt().coerceIn(1, steps.size)
            while (k < steps.size && total / k > ROW_TARGET) k++
            val rows = partitionRows(steps, k, cfg)
            layoutForRows(steps, rows, cfg)
        } else {
            var bestScale = -1f
            var bestLayout: RawLayout? = null
            val maxK = min(steps.size, 14)
            for (k in 1..maxK) {
                var rows = partitionRows(steps, k, cfg).toMutableList()
                repeat(3) {
                    var improved = false
                    val l0 = layoutForRows(steps, rows, cfg)
                    val (w0, h0) = bboxSize(steps, l0, cfg.margin)
                    var sc0 = min(pageW / max(1f, w0), pageH / max(1f, h0))
                    for (bIdx in 0 until rows.size - 1) {
                        for (delta in intArrayOf(-1, 1)) {
                            val (a1, b1) = rows[bIdx]
                            val (a2, b2) = rows[bIdx + 1]
                            val nb1 = b1 + delta
                            val na2 = a2 + delta
                            if (nb1 < a1 || na2 > b2) continue
                            val cand = rows.toMutableList()
                            cand[bIdx] = a1 to nb1
                            cand[bIdx + 1] = na2 to b2
                            val lc = layoutForRows(steps, cand, cfg)
                            val (wc, hc) = bboxSize(steps, lc, cfg.margin)
                            val scc = min(pageW / max(1f, wc), pageH / max(1f, hc))
                            if (scc > sc0 + 1e-6f) {
                                rows = cand
                                sc0 = scc
                                improved = true
                            }
                        }
                    }
                    if (!improved) return@repeat
                }
                val res = layoutForRows(steps, rows, cfg)
                val (w, h) = bboxSize(steps, res, cfg.margin)
                val sc = min(pageW / max(1f, w), pageH / max(1f, h))
                if (sc > bestScale) {
                    bestScale = sc
                    bestLayout = res
                }
            }
            bestLayout!!
        }

        val nNodes = steps.size + 1
        var minX = Float.POSITIVE_INFINITY
        var minY = Float.POSITIVE_INFINITY
        var maxX = Float.NEGATIVE_INFINITY
        var maxY = Float.NEGATIVE_INFINITY

        for (i in 0 until nNodes) {
            val bmp = if (i > 0) steps[i - 1].product else steps[0].substrate
            minX = min(minX, raw.posX[i])
            minY = min(minY, raw.posY[i])
            maxX = max(maxX, raw.posX[i] + bmp.width)
            maxY = max(maxY, raw.posY[i] + bmp.height)
        }
        for (l in raw.labels) {
            minX = min(minX, l.x)
            minY = min(minY, l.y)
            maxX = max(maxX, l.x + l.width)
            maxY = max(maxY, l.y + l.height)
        }
        for (a in raw.arrows) {
            minX = min(minX, min(a.x1, a.x2))
            minY = min(minY, min(a.y1, a.y2))
            maxX = max(maxX, max(a.x1, a.x2))
            maxY = max(maxY, max(a.y1, a.y2))
        }

        val dx = cfg.margin - minX
        val dy = cfg.margin - minY
        val boardW = maxX - minX + 2f * cfg.margin
        val boardH = maxY - minY + 2f * cfg.margin

        var stageCounter = 0
        val nodes = List(nNodes) { i ->
            val bmp = if (i > 0) steps[i - 1].product else steps[0].substrate
            val hidden = i in 1 until (nNodes - 1)
            if (hidden) stageCounter++
            LayoutNode(
                index = i,
                x = raw.posX[i] + dx,
                y = raw.posY[i] + dy,
                width = bmp.width.toFloat(),
                height = bmp.height.toFloat(),
                bitmap = bmp,
                hiddenByDefault = hidden,
                stageNumber = if (hidden) stageCounter else 0,
            )
        }

        val shiftedLabels = raw.labels.map {
            it.copy(x = it.x + dx, y = it.y + dy)
        }
        val shiftedArrows = raw.arrows.map {
            it.copy(x1 = it.x1 + dx, y1 = it.y1 + dy, x2 = it.x2 + dx, y2 = it.y2 + dy)
        }

        return SnakeBoard(
            width = boardW,
            height = boardH,
            nodes = nodes,
            labels = shiftedLabels,
            arrows = shiftedArrows,
        )
    }
}
