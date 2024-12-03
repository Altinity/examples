const kafka = require('kafka-node');

// Default values
const defaultBootstrapServer = 'localhost:9092';
const defaultTopicName = 'retail_data';

// Parse command-line arguments
const args = process.argv.slice(2); // Exclude "node" and script name
let bootstrapServer = process.env.BOOTSTRAP_SERVER || defaultBootstrapServer;
let topicName = process.env.TOPIC_NAME || defaultTopicName;

// Parse arguments
args.forEach((arg, index) => {
    if (arg.startsWith('--bootstrap-server') || arg === '-b') {
        bootstrapServer = args[index + 1] || bootstrapServer;
    } else if (arg.startsWith('--topic-name') || arg === '-t') {
        topicName = args[index + 1] || topicName;
    } else if (arg === '--help' || arg === '-h') {
        console.log('A simple node application that generates random JSON documents and writes them to a Kafka topic.\n');
        console.log('Options:');
        console.log('  --bootstrap-server, -b  The Kafka bootstrap server(s) ');
        console.log('                          [or envvar BOOTSTRAP_SERVER or "localhost:9092"]');
        console.log('  --topic-name, -t        The Kafka topic name');
        console.log('                          [or envvar TOPIC_NAME or "retail_data"]');
        console.log('  --help, -h              Show this help message and exit');
        process.exit(0);
    }
});

// Kafka client and producer setup
const client = new kafka.KafkaClient({ kafkaHost: bootstrapServer});

const producer = new kafka.Producer(client);

// Constants for generating random data
const customerIds = ['C001', 'C002', 'C003', 'C004', 'C005'];
const storeIds = ['S001', 'S002', 'S003', 'S004', 'S005'];
const itemIds = ['I001', 'I002', 'I003', 'I004', 'I005', 'I006', 'I007', 'I008', 'I009', 'I010'];

// Function to generate a random integer between two values (inclusive)
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to generate a random price (multiples of $10)
const generateRandomPrice = () => getRandomInt(1, 10) * 10.0;

// Function to generate a random item with quantity and price
const generateRandomItems = () => {
    const numItems = getRandomInt(1, 5); // Random number of items per transaction
    const items = [];
    for (let i = 0; i < numItems; i++) {
        const itemId = itemIds[getRandomInt(0, itemIds.length - 1)];
        const quantity = getRandomInt(1, 3); // Random quantity between 1 and 3
        const price = generateRandomPrice();
        items.push({
            item_id: itemId,
            quantity: quantity,
            price: price
        });
    }
    return items;
};

// Function to generate a random Kafka message
const generateMessage = () => {
    const message = {
        transaction_id: `T${getRandomInt(10000, 99999)}`, // Random transaction ID
        customer_id: customerIds[getRandomInt(0, customerIds.length - 1)], // Random customer ID
        timestamp: new Date().toISOString(), // Current timestamp
        items: generateRandomItems(), // Random items array
        total_amount: 0.0, // Total amount will be calculated below
        store_id: storeIds[getRandomInt(0, storeIds.length - 1)] // Random store ID
    };

    // Calculate the total amount
    message.total_amount = message.items.reduce((total, item) => total + (item.price * item.quantity), 0);

    return message;
};

// Function to send a message to the Kafka topic
const sendMessage = () => {
    const messageContent = generateMessage();

    // Prepare the payload for Kafka
    const payloads = [
        {
            topic: topicName,
            messages: JSON.stringify(messageContent)
        }
    ];

    // Send the message
    producer.send(payloads, (err, data) => {
        if (err) {
            console.error('Error sending message to Kafka:', err);
        } else {
            console.log('Message sent successfully:', data);
        }
    });
};

// Start the producer and send a message every second
producer.on('ready', () => {
    console.log('Producer is ready, sending messages every second...');
    setInterval(sendMessage, 1000); // Send a message every second
});

// Log any errors from the producer
producer.on('error', (err) => {
    console.error('Producer error:', err);
});
