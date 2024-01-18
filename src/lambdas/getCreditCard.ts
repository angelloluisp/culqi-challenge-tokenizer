import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import "source-map-support/register";
import "reflect-metadata";
import { dataSourceGetRepository } from "../utils/database";
import { authMiddleware, getAuthorizationToken } from "../utils/methods";
import { CreditCard, CreditCardToken } from "../entities";
import corsHeaders from "../utils/constants/corsHeaders";
import {StatusCode} from "../utils/constants/statusCode";

export const handler: APIGatewayProxyHandler = authMiddleware(
  async (
    event: APIGatewayProxyEvent,
    _context: Context
  ): Promise<APIGatewayProxyResult> => {
    _context.callbackWaitsForEmptyEventLoop = false;

    try {
      const token = getAuthorizationToken(event);

      if (!token) {
        return {
          statusCode: StatusCode.STATUS_400,
          headers: corsHeaders,
          body: JSON.stringify({ message: "Token es requerido." }),
        };
      }

      return await processCharge(token);
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

const processCharge = async (token: string) => {
  const creditCardTokenRepository =
    await dataSourceGetRepository<CreditCardToken>(CreditCardToken);

  const creditCardToken = (
    await creditCardTokenRepository.find({
      where: {
        token,
      },
      select: ["expires_at", "credit_card._id"],
    })
  )?.[0];

  if (!creditCardToken) throw new Error("Token inválido");

  if (creditCardToken.expires_at < new Date()) throw new Error("El token está expirado");

  const creditCardRepository = await dataSourceGetRepository<CreditCard>(
    CreditCard
  );

  const creditCard = (
    await creditCardRepository.find({
      where: {
        _id: creditCardToken.credit_card._id,
      },
      select: ["card_number", "email", "expiration_month", "expiration_year"],
    })
  )?.[0];

  if (!creditCard) throw new Error("Tarjeta ingresada no encontrada.");

  return {
    statusCode: StatusCode.STATUS_200,
    headers: corsHeaders,
    body: JSON.stringify({
      message: "Charge processed",
      data: {
        card_number: creditCard.card_number,
        email: creditCard.email,
        expiration_month: creditCard.expiration_month,
        expiration_year: creditCard.expiration_year,
      },
    }),
  };
};
