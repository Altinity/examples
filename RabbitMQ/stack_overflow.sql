SET flatten_nested = 0 -- important to avoid flattening of nested jsons with arrays and maps of tuples

CREATE TABLE IF NOT EXISTS rabbitmq.stack_overflow_queue 
(
    `title` String,
    `qid` String,
    `answers` Array(Map(String, String)),
    `tag` Array(LowCardinality(String)),
    `user` String,
    `creationDate` DateTime64(3)
) 
engine = RabbitMQ
SETTINGS
    rabbitmq_host_port = 'localhost:5672',
    rabbitmq_exchange_name = 'exchange-test1', -- required parameter like kafka_consumer_group
    rabbitmq_queue_consume = true,
    rabbitmq_queue_base = 'stack-overflow', -- create a queue with this name
    rabbitmq_format = 'JSONEachRow',
    input_format_import_nested_json = 1, 
    date_time_input_format = 'best_effort',
    input_format_skip_unknown_fields = 1,
    --rabbitmq_max_block_size = 1024000,
    --rabbitmq_flush_interval_ms = 5000,
    --rabbitmq_num_consumers = 1 default
    rabbitmq_username = 'guest',
    rabbitmq_password = 'guest';

CREATE MATERIALIZED VIEW rabbitmq.tack_overflow_mv TO rabbitmq.stack_overflow AS
SELECT
    title,
    toUInt32(qid) AS qid,
    answers,
    tag,
    user,
    creationDate
FROM rabbitmq.stack_overflow_queue


CREATE TABLE rabbitmq.stack_overflow
(
    `title` String,
    `qid` UInt32,
    `answers` Array(Map(String, String)),
    `tag` Array(LowCardinality(String)),
    `user` String,
    `creationDate` DateTime64(3)
)
ENGINE = MergeTree
PARTITION BY tuple()
ORDER BY (user, creationDate)
SETTINGS index_granularity = 8192

