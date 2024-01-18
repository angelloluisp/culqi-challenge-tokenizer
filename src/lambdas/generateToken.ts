import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { creditCardSchema } from "../schemas";
import {
  authMiddleware,
  expiresDate,
  generateCrediCardToken,
} from "../utils/methods";
import { CreditCard, CreditCardToken } from "../entities";
import { dataSourceGetRepository } from "../utils/database";
import { CreditCardRequest } from "../utils/interfaces";
import { MongoRepository, ObjectId } from "typeorm";
import corsHeaders from "../utils/constants/corsHeaders";
import {StatusCode} from "../utils/constants/statusCode";

export const handler: APIGatewayProxyHandler = authMiddleware(
  async (
    event: APIGatewayProxyEvent,
    _context: Context
  ): Promise<APIGatewayProxyResult> => {
    _context.callbackWaitsForEmptyEventLoop = false;

    try {
      const data = JSON.parse(event.body!);
      console.log("data", data)
      return await generateToken(data);
    } catch (error) {
      return {
        statusCode: StatusCode.STATUS_500,
        headers: corsHeaders,
        body: JSON.stringify({
          error:
            error && (error as any).message
              ? (error as any).message
              : "Upss... Ocurrió un problema comuniquese con nuestro equipo.",
        }),
      };
    }
  }
);

const generateToken = async (data: any) => {
  const validationCreditCardResult = creditCardSchema.safeParse(data);
  console.log("validationCreditCardResult", validationCreditCardResult);
  if (!validationCreditCardResult.success){
    console.log("entro acá no se porque")
    throw new Error(validationCreditCardResult.error.message);
  }
  console.log("pasó la validación")
  const { card_number, email, expiration_month, expiration_year } = data;
  console.log("card_number", card_number)
  console.log("email", email)
  console.log("expiration_month", expiration_month)
  console.log("expiration_year", expiration_year)

  const token = generateCrediCardToken();

  console.log("token", token)

  const creditCardRepository = await dataSourceGetRepository<CreditCard>(
    CreditCard
  );

  console.log("creditCardRepository", creditCardRepository)

  const creditCardTokenRepository =
    await dataSourceGetRepository<CreditCardToken>(CreditCardToken);

  console.log("creditCardTokenRepository", creditCardTokenRepository)

  const creditCard = await getOrCreateCreditCard(creditCardRepository, {
    card_number,
    email,
    expiration_month,
    expiration_year,
  });

  console.log("creditCard", creditCard)

  await createCreditCardToken(creditCardTokenRepository, {
    token,
    creditCard,
  });

  return {
    statusCode: StatusCode.STATUS_200,
    headers: corsHeaders,
    body: JSON.stringify({ token }),
  };
};

const getOrCreateCreditCard = async (
  creditCardRepository: MongoRepository<CreditCard>,
  { card_number, email, expiration_month, expiration_year }: CreditCardRequest
) => {
  const creditCard = await creditCardRepository.findOne({
    where: {
      card_number: card_number,
      email: email,
      expiration_month: expiration_month,
      expiration_year: expiration_year,
    },
  });

  if (creditCard) return creditCard;

  const newCreditCard = CreditCard.create({
    card_number,
    email,
    expiration_month,
    expiration_year,
  });

  const savedCreditCard = await creditCardRepository.save(newCreditCard);

  return savedCreditCard;
};

const createCreditCardToken = async (
  creditCardTokenRepository: MongoRepository<CreditCardToken>,
  {
    token,
    creditCard,
  }: {
    token: string;
    creditCard: CreditCard;
  }
) => {
  /* const creditCardToken = await creditCardTokenRepository.findOne({
    where: {
      credit_card: creditCard,
    },
  }); */

  /* if (creditCardToken) {
    await creditCardTokenRepository.updateOne(
      {
        _id: creditCardToken._id,
      },
      {
        $set: {
          token,
          expires_at: expiresDate(),
        },
      },
      {}
    );
  } else {
  } */
  await creditCardTokenRepository.save(
    CreditCardToken.create({
      credit_card: creditCard,
      token,
    })
  );
};
