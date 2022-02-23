# KAFKA RETRY

[Docs](https://github.com/nattogo/kafka-retry/blob/master/README.MD) |
[MIT Licensed](https://github.com/nattogo/kafka-retry/blob/master/LICENSE.MD)

Kafka retry topic for nestjs microservice.

## Usage example


```typescript

const kafkaOptions = {};
const app = await NestFactory.create(AppModule);
app.connectMicroservice({
    strategy: new KafkaStrategy(kafkaOptions)
});
await app.startAllMicroservices();

```

Decorate your controllers with the `@KafkaListener` and  `@KafkaDlt` decorators:

```typescript

@Controller()
export class UserController {
  @KafkaListener('user-created', {
      attempts: 1,
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
        //Todo
      } catch (err) {
        throw new RpcException('abcd');
      }
    return data;
  }

  @KafkaDlt('user-created')
  public async handleDeadLetterTopic(
    @Payload() data, 
    @Ctx() ctx: KafkaContext
    ) {
    return data;
  }
}
```