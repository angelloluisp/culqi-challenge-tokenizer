import {
  DataSource,
  EntityTarget,
  MongoRepository,
  ObjectLiteral,
} from "typeorm";
import config from "../config";
import { CreditCard, CreditCardToken } from "../entities";

const dataSource = new DataSource({
  type: "mongodb",
  url: config.MONGODB_URL,
  entities: [CreditCard, CreditCardToken],
  //synchronize: true,
});

export const dataSourceGetRepository = async <T extends ObjectLiteral>(
  entity: EntityTarget<T>
): Promise<MongoRepository<T>> => {
  console.log("dataSource", dataSource)
  if (dataSource.isInitialized === false) {
    console.log("dataSource.isInitialized", dataSource.isInitialized)
    await dataSource.initialize();
    console.log("dataSource.isInitialized", dataSource.isInitialized)
  }
  console.log("dataSource.getMongoRepository(entity)", dataSource.getMongoRepository(entity))


  return dataSource.getMongoRepository(entity) as MongoRepository<T>;
};
