# KAFKA RETRY

[Docs](https://github.com/nattogo/kafka-retry/blob/master/README.MD) |
[MIT Licensed](https://github.com/nattogo/kafka-retry/blob/master/LICENSE.MD)

Kafka non-blocking retry topic for nestjs microservice.

### Non-Blocking Retries and Dead Letter Topics
![solution](https://evgeniy-khist.github.io/spring-kafka-non-blocking-retries-and-dlt/img/kafka-blocking-retries.png)
![solution](https://evgeniy-khist.github.io/spring-kafka-non-blocking-retries-and-dlt/img/kafka-non-blocking-retries-1.png)

[See more: Spring Kafka Non-Blocking Retries and Dead Letter Topics](https://evgeniy-khist.github.io/spring-kafka-non-blocking-retries-and-dlt/)
## Usage example

```ts
// main.ts
import {KafkaOptions} from "@nestjs/microservices";

const kafkaOptions: KafkaOptions = {};
const app = await NestFactory.create(AppModule);
app.connectMicroservice({
    strategy: new KafkaStrategy(kafkaOptions)
});
await app.startAllMicroservices();

```
Decorate your controllers with the `@KafkaListener` and  `@KafkaDlt` decorators:

```typescript
// controller.ts
@Controller()
export class UserController {
  @KafkaListener('user-created', {
      attempts: 2,
      backoff:  {
          delay: 200,
          multiplier: 2.0, 
      },
      autoCreateRetryTopic: true,
  })
  public async message(
    @Payload() data, 
    @Ctx() ctx: KafkaContext
    ) {
      try {
        //Todo something
      } catch (err) {
          // must throw RpcException
        throw new RpcException('abcd');
      }
  }

  @KafkaDlt('user-created')
  public async handleDeadLetterTopic(
    @Payload() data, 
    @Ctx() ctx: KafkaContext
    ) {
      //Todo something to report 
  }
}
```
With this `@KafkaListener`, the first delivery attempt fails and the record is sent to a topic `user-created-retry-1` configured for a `200ms delay`. When that delivery fails, the record is sent to a topic `user-created-retry-2` with a `400ms delay` and, finally, to a dead letter topic `user-created-dlt`  handled by @KafkaDlt.

