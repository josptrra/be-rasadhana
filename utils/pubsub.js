import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const TOPIC_NAME = process.env.GCLOUD_PUBSUB_TOPIC_NAME || 'save-recipe-notification';

async function publishMessage(data) {
  const messageBuffer = Buffer.from(JSON.stringify(data));
  try {
    await pubsub.topic(TOPIC_NAME).publish(messageBuffer);
    console.log('Message published to Pub/Sub topic:', TOPIC_NAME);
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
}

export { publishMessage };
