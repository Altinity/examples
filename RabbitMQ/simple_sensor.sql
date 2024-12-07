CREATE TABLE IF NOT EXIST rabbitmq.broker_test 
(
    id UUID,
    timestamp DateTime64(3),
    value Decimal32(1),
    message String
) 
engine = RabbitMQ
SETTINGS
    rabbitmq_host_port = 'localhost:5672',
    rabbitmq_exchange_name = 'exchange-test1', -- required parameter like kafka_consumer_group
    rabbitmq_queue_consume = true,
    rabbitmq_queue_base = 'queue-test1',
    rabbitmq_format = 'JSONEachRow',
    rabbitmq_max_block_size = 1024000,
    rabbitmq_flush_interval_ms = 5000,
    --rabbitmq_num_consumers = 1 default
    rabbitmq_username = 'guest',
    rabbitmq_password = 'guest'

-- https://clickhouse.com/docs/en/engines/table-engines/integrations/rabbitmq/

