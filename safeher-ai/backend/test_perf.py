import time
from model import generate_heatmap

print("Testing heatmap generation performance...")
start = time.time()
points = generate_heatmap(13.0, 77.6, 20, 3)
elapsed = time.time() - start

print(f"\n✓ First call (uncached) took: {elapsed:.2f}s")
print(f"✓ Grid points returned: {len(points)}")

# Test cache hit
start2 = time.time()
points2 = generate_heatmap(13.0, 77.6, 20, 3)
elapsed2 = time.time() - start2

print(f"✓ Second call (cached) took: {elapsed2:.6f}s")
if elapsed2 > 0:
    print(f"✓ Speedup: {elapsed/elapsed2:.0f}x faster")
else:
    print(f"✓ Cache hit: effectively instant!")

if points:
    print(f"\nSample point: {points[0]}")
