# Connecting ClickHouse® and Apache Kafka®

This is a simple node application that generates random JSON documents and writes them to a Kafka topic. This is part of a complete ClickHouse and Kafka application described in the post [Connecting ClickHouse® to Apache Kafka®](https://altinity.com/blog/connecting-clickhouse-to-apache-kafka) on [the Altinity® blog](https://altinity.com/blog). 

The code generates a random document every second and puts it on a Kafka topic. Type Ctrl+C to stop it.

## Running the code

Running the code is simple: 

```
npm install
npm run start
```

You'll see something like this: 

```
npm run start

> node@1.0.0 start
> node producer.js

Producer is ready, sending messages every second...
Message sent successfully: { retail_data: { '0': 0 } }
Message sent successfully: { retail_data: { '0': 1 } }
Message sent successfully: { retail_data: { '0': 2 } }
Message sent successfully: { retail_data: { '0': 3 } }
```

## Setting parameters

The code has two parameters: `boostrap-server` and `topic-name`. The defaults are `localhost:9092` and `retail_data`. To change them, you can specify new values with the `--boostrap-server` and `--topic-name` command-line parameters. You can also define them with the `BOOTSTRAP_SERVER` and `TOPIC_NAME` environment variables. 

To see the details, run `npm run start -- -h`. You'll see this message: 

```
A simple node application that generates random JSON documents and writes them to a Kafka topic.

Options:
  --bootstrap-server, -b  The Kafka bootstrap server(s) 
                          [or envvar BOOTSTRAP_SERVER or "localhost:9092"]
  --topic-name, -t        The Kafka topic name
                          [or envvar TOPIC_NAME or "retail_data"]
  --help, -h              Show this help message and exit
```

(Be sure to put the double hyphens before the command-line option. `npm run start -h` will fail.)

Command-line options take first priority, then the environment variables, then the code will use the defaults.

## JSON document format

The code generates JSON documents that look like this:

```
{
  "transaction_id": "T43379",
  "customer_id": "C004",
  "timestamp": "2024-09-12T16:16:38.935Z",
  "items": [
    {
      "item_id": "I005",
      "quantity": 3,
      "price": 100
    },
    {
      "item_id": "I001",
      "quantity": 1,
      "price": 40
    }
  ],
  "total_amount": 340,
  "store_id": "S001"
}
```

Each randomly generated document represents a sale of some number of items to a particular customer at a particular store. In this example, customer C004 went to store S001 and bought three of item I005 at $100 each and one of item I001 at $40, for a total of $340. 

