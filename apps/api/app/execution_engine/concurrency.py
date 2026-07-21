"""Per-workspace run concurrency limits. Stub — enforce via Redis when needed."""

# ponytail: no limiter until runs actually pile up. When they do:
# a Redis INCR/DECR keyed by workspace_id around run_workflow.
DEFAULT_MAX_CONCURRENT_RUNS = 3
