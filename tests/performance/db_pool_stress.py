import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy import create_engine, text
from app.core.config import settings

# Stress testing configuration
CONCURRENT_THREADS = 15
TOTAL_REQUESTS = 50

# Database engine to test against
engine = create_engine(settings.DATABASE_URL)

def run_db_query(thread_id):
    start = time.time()
    success = False
    error_msg = None
    try:
        # Open connection and run a simple query
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).fetchone()
            if result and result[0] == 1:
                success = True
    except Exception as e:
        error_msg = str(e)
    
    elapsed = time.time() - start
    return thread_id, success, elapsed, error_msg

def main():
    print(f"Starting DB connection pool stress test...")
    print(f"Connection Pool: size={engine.pool.size()}, max_overflow={engine.pool._max_overflow}, timeout={engine.pool._timeout}")
    print(f"Spawning {CONCURRENT_THREADS} concurrent threads to make a total of {TOTAL_REQUESTS} requests...")

    latencies = []
    success_count = 0
    failure_count = 0
    failures = []

    start_time = time.time()
    with ThreadPoolExecutor(max_workers=CONCURRENT_THREADS) as executor:
        futures = [executor.submit(run_db_query, i) for i in range(TOTAL_REQUESTS)]
        
        for future in as_completed(futures):
            tid, success, elapsed, error_msg = future.result()
            latencies.append(elapsed)
            if success:
                success_count += 1
            else:
                failure_count += 1
                failures.append(error_msg)

    total_time = time.time() - start_time
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0
    min_latency = min(latencies) if latencies else 0

    print("\n--- RESULTS ---")
    print(f"Total Time Taken:  {total_time:.3f} seconds")
    print(f"Successful Req:    {success_count}")
    print(f"Failed Requests:   {failure_count}")
    print(f"Min Latency:       {min_latency:.3f}s")
    print(f"Avg Latency:       {avg_latency:.3f}s")
    print(f"Max Latency:       {max_latency:.3f}s")

    if failure_count > 0:
        print(f"\nFirst 5 unique failure messages:")
        for fail in list(set(failures))[:5]:
            print(f" - {fail}")

if __name__ == "__main__":
    main()
