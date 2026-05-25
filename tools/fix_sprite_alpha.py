from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "sprites"
WWW_SPRITES = ROOT / "www" / "sprites"
TARGET_DIRS = [SPRITES / "player", SPRITES / "enemies"]
SLIME_FILES = {
    "enemies/slime_sheet.png",
    "enemies/green_slime_sheet_1779305690146.png",
    "enemies/slime_fire_sheet.png",
    "enemies/fire_slime_sheet_1779305755057.png",
    "enemies/slime_shadow_sheet.png",
    "enemies/shadow_slime_sheet_1779305774648.png",
}
GOBLIN_FILES = {
    "enemies/goblin_sheet.png",
    "enemies/dungeon_goblin_sheet_1779305888771.png",
}


def is_gray_background(px):
    r, g, b, a = px
    if a <= 8:
        return True
    if a < 35:
        return True
    maxc = max(r, g, b)
    minc = min(r, g, b)
    sat = 0 if maxc == 0 else (maxc - minc) / maxc
    bright = (r + g + b) / 3
    return sat <= 0.18 and 70 <= bright <= 245


def remove_connected_checkerboard(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = bytearray(w * h)
    queue = []
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(1, h - 1):
        queue.append((0, y))
        queue.append((w - 1, y))

    changed = 0
    head = 0
    while head < len(queue):
        x, y = queue[head]
        head += 1
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        idx = y * w + x
        if visited[idx]:
            continue
        visited[idx] = 1
        if not is_gray_background(px[x, y]):
            continue

        r, g, b, a = px[x, y]
        if a != 0:
            px[x, y] = (r, g, b, 0)
            changed += 1

        queue.append((x + 1, y))
        queue.append((x - 1, y))
        queue.append((x, y + 1))
        queue.append((x, y - 1))

    if changed:
        img.save(path)
    return changed


def remove_gray_backdrop_anywhere(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    changed = 0

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and is_gray_background((r, g, b, a)):
                px[x, y] = (r, g, b, 0)
                changed += 1

    if changed:
        img.save(path)
    return changed


def is_player_backdrop(px):
    r, g, b, a = px
    if a <= 8:
        return True
    if a < 35:
        return True
    maxc = max(r, g, b)
    minc = min(r, g, b)
    sat = 0 if maxc == 0 else (maxc - minc) / maxc
    bright = (r + g + b) / 3
    return sat <= 0.36 and 45 <= bright <= 255


def remove_player_backdrop(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = bytearray(w * h)
    queue = []
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(1, h - 1):
        queue.append((0, y))
        queue.append((w - 1, y))

    changed = 0
    head = 0
    while head < len(queue):
        x, y = queue[head]
        head += 1
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        idx = y * w + x
        if visited[idx]:
            continue
        visited[idx] = 1
        if not is_player_backdrop(px[x, y]):
            continue

        r, g, b, a = px[x, y]
        if a:
            px[x, y] = (r, g, b, 0)
            changed += 1

        queue.append((x + 1, y))
        queue.append((x - 1, y))
        queue.append((x, y + 1))
        queue.append((x, y - 1))

    if changed:
        img.save(path)
    return changed


def is_goblin_backdrop(px):
    r, g, b, a = px
    if a <= 8:
        return True
    maxc = max(r, g, b)
    minc = min(r, g, b)
    sat = 0 if maxc == 0 else (maxc - minc) / maxc
    bright = (r + g + b) / 3
    return bright <= 24 or sat <= 0.36


def remove_goblin_backdrop(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = bytearray(w * h)
    queue = []
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(1, h - 1):
        queue.append((0, y))
        queue.append((w - 1, y))

    changed = 0
    head = 0
    while head < len(queue):
        x, y = queue[head]
        head += 1
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        idx = y * w + x
        if visited[idx]:
            continue
        visited[idx] = 1
        if not is_goblin_backdrop(px[x, y]):
            continue

        r, g, b, a = px[x, y]
        if a:
            px[x, y] = (r, g, b, 0)
            changed += 1

        queue.append((x + 1, y))
        queue.append((x - 1, y))
        queue.append((x, y + 1))
        queue.append((x, y - 1))

    if changed:
        img.save(path)
    return changed


def remove_slime_backdrop(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    core = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 20:
                continue
            maxc = max(r, g, b)
            minc = min(r, g, b)
            sat = 0 if maxc == 0 else (maxc - minc) / maxc
            bright = (r + g + b) / 3
            if sat > 0.26 and bright > 48:
                core[y * w + x] = 1

    # Expand from colored slime pixels to keep black outlines and glow fringes.
    keep = bytearray(core)
    frontier = [(i % w, i // w) for i, value in enumerate(core) if value]
    for _ in range(10):
        next_frontier = []
        for x, y in frontier:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    idx = ny * w + nx
                    if not keep[idx]:
                        keep[idx] = 1
                        next_frontier.append((nx, ny))
        frontier = next_frontier
        if not frontier:
            break

    changed = 0
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            r, g, b, a = px[x, y]
            if a and not keep[idx]:
                px[x, y] = (r, g, b, 0)
                changed += 1

    if changed:
        img.save(path)
    return changed


def main():
    changed_files = []
    for directory in TARGET_DIRS:
        for path in sorted(directory.glob("*.png")):
            rel = path.relative_to(SPRITES).as_posix()
            if rel in SLIME_FILES:
                changed = remove_slime_backdrop(path)
            elif rel in GOBLIN_FILES:
                changed = remove_goblin_backdrop(path)
            elif rel.startswith("player/"):
                changed = remove_player_backdrop(path)
            else:
                changed = remove_player_backdrop(path)
            if changed:
                changed_files.append((path, changed))

    for path, _ in changed_files:
        rel = path.relative_to(SPRITES)
        dest = WWW_SPRITES / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)

    print(f"Updated {len(changed_files)} sprite files")
    for path, changed in changed_files:
        print(f"{path.relative_to(ROOT)}: {changed} pixels")


if __name__ == "__main__":
    main()
