/* eslint-disable @typescript-eslint/no-invalid-void-type */

import { type NextRequest, type NextResponse } from 'next/server';
import {
  type NextApiResponse,
  type NextApiRequest,
  type NextApiHandler
} from 'next/types';

import { type ValidMethod } from '../constants';
import { type Modify } from './utility-types';
import { type NextURL } from 'next/dist/server/web/next-url';

import { type OpenAPIV3_1 } from 'openapi-types';
import { type AnyContentTypeWithAutocompleteForMostCommonOnes } from './content-types';
import { type ZodSchema, type z } from 'zod';

type BaseStatus = number;
type BaseContentType = AnyContentTypeWithAutocompleteForMostCommonOnes;
export type BaseQuery = Record<string, string | string[]>;

export interface InputObject<
  Body = unknown,
  Query extends BaseQuery = BaseQuery
> {
  contentType?: BaseContentType;
  body?: ZodSchema<Body>;
  query?: ZodSchema<Query>;
}

export interface OutputObject<
  Body = unknown,
  Status extends BaseStatus = BaseStatus
> {
  schema: ZodSchema<Body>;
  status: Status;
  contentType: BaseContentType;
}

type TypedNextRequest<Body, Query extends BaseQuery> = Modify<
  NextRequest,
  {
    json: () => Promise<Body>;
    method: ValidMethod;
    nextUrl: Modify<
      NextURL,
      {
        searchParams: Modify<
          URLSearchParams,
          {
            get: (key: keyof Query) => string | null;
            getAll: (key: keyof Query) => string[];
          }
        >;
      }
    >;
  }
>;

type TypedNextResponse<Body> = NextResponse<Body>;

type RouteHandler<
  Body = unknown,
  Query extends BaseQuery = BaseQuery,
  ResponseBody = unknown,
  Status extends BaseStatus = BaseStatus,
  Output extends ReadonlyArray<
    OutputObject<ResponseBody, Status>
  > = ReadonlyArray<OutputObject<ResponseBody, Status>>,
  TypedResponse = TypedNextResponse<z.infer<Output[number]['schema']>> | void
> = (
  req: TypedNextRequest<Body, Query>,
  context: { params: Record<string, string> }
) => Promise<TypedResponse> | TypedResponse;

type RouteOutput<
  Middleware extends boolean = false,
  Body = unknown,
  Query extends BaseQuery = BaseQuery
> = <
  ResponseBody,
  Status extends BaseStatus,
  Output extends ReadonlyArray<OutputObject<ResponseBody, Status>>
>(
  params?: Output
) => {
  handler: (
    callback?: RouteHandler<Body, Query, ResponseBody, Status, Output>
  ) => RouteOperationDefinition;
} & (Middleware extends true
  ? {
      middleware: (
        callback?: RouteHandler<Body, Query, ResponseBody, Status, Output>
      ) => {
        handler: (
          callback?: RouteHandler<Body, Query, ResponseBody, Status, Output>
        ) => RouteOperationDefinition;
      };
    }
  : Record<string, unknown>);

type RouteInput<Middleware extends boolean = false> = <
  Body,
  Query extends BaseQuery
>(
  params?: InputObject<Body, Query>
) => {
  output: RouteOutput<Middleware, Body, Query>;
  handler: (callback?: RouteHandler<Body, Query>) => RouteOperationDefinition;
} & (Middleware extends true
  ? {
      middleware: (callback?: RouteHandler<Body, Query>) => {
        output: RouteOutput<false, Body, Query>;
        handler: (
          callback?: RouteHandler<Body, Query>
        ) => RouteOperationDefinition;
      };
    }
  : Record<string, unknown>);

export type RouteOperation = (
  openApiOperation?: OpenAPIV3_1.OperationObject
) => {
  input: RouteInput<true>;
  output: RouteOutput<true>;
  middleware: (middleware?: RouteHandler) => {
    handler: (callback?: RouteHandler) => RouteOperationDefinition;
  };
  handler: (callback?: RouteHandler) => RouteOperationDefinition;
};

export type NextRouteHandler = (
  req: NextRequest,
  context: { params: BaseQuery }
) => Promise<NextResponse>;

export interface RouteOperationDefinition {
  _config: {
    openApiOperation?: OpenAPIV3_1.OperationObject;
    input?: InputObject;
    output?: readonly OutputObject[];
    middleware?: NextRouteHandler;
    handler?: NextRouteHandler;
  };
}

export interface RouteParams {
  openApiPath?: OpenAPIV3_1.PathItemObject;
  [ValidMethod.GET]?: RouteOperationDefinition;
  [ValidMethod.PUT]?: RouteOperationDefinition;
  [ValidMethod.POST]?: RouteOperationDefinition;
  [ValidMethod.DELETE]?: RouteOperationDefinition;
  [ValidMethod.OPTIONS]?: RouteOperationDefinition;
  [ValidMethod.HEAD]?: RouteOperationDefinition;
  [ValidMethod.PATCH]?: RouteOperationDefinition;
}

type TypedNextApiRequest<Body, Query> = Modify<
  NextApiRequest,
  {
    body: Body;
    query: Query;
    method: ValidMethod;
  }
>;

type TypedNextApiResponse<Body, Status> = Modify<
  NextApiResponse<Body>,
  {
    status: (status: Status) => NextApiResponse<Body>;
    redirect: (status: Status, url: string) => NextApiResponse<Body>;
  }
>;

type ApiRouteHandler<
  Body = unknown,
  Query extends BaseQuery = BaseQuery,
  ResponseBody = unknown,
  Status extends BaseStatus = BaseStatus,
  Output extends ReadonlyArray<
    OutputObject<ResponseBody, Status>
  > = ReadonlyArray<OutputObject<ResponseBody, Status>>
> = (
  req: TypedNextApiRequest<Body, Query>,
  res: TypedNextApiResponse<
    z.infer<Output[number]['schema']>,
    Output[number]['status']
  >
) => Promise<void> | void;

type ApiRouteOutput<
  Middleware extends boolean = false,
  Body = unknown,
  Query extends BaseQuery = BaseQuery
> = <
  ResponseBody,
  Status extends BaseStatus,
  Output extends ReadonlyArray<OutputObject<ResponseBody, Status>>
>(
  params?: Output
) => {
  handler: (
    callback?: ApiRouteHandler<Body, Query, ResponseBody, Status, Output>
  ) => ApiRouteOperationDefinition;
} & (Middleware extends true
  ? {
      middleware: (
        callback?: ApiRouteHandler<Body, Query, ResponseBody, Status, Output>
      ) => {
        handler: (
          callback?: ApiRouteHandler<Body, Query, ResponseBody, Status, Output>
        ) => ApiRouteOperationDefinition;
      };
    }
  : Record<string, unknown>);

type ApiRouteInput<Middleware extends boolean = false> = <
  Body,
  Query extends BaseQuery
>(
  params?: InputObject<Body, Query>
) => {
  output: ApiRouteOutput<Middleware, Body, Query>;
  handler: (
    callback?: ApiRouteHandler<Body, Query>
  ) => ApiRouteOperationDefinition;
} & (Middleware extends true
  ? {
      middleware: (callback?: ApiRouteHandler<Body, Query>) => {
        output: ApiRouteOutput<false, Body, Query>;
        handler: (
          callback?: ApiRouteHandler<Body, Query>
        ) => ApiRouteOperationDefinition;
      };
    }
  : Record<string, unknown>);

export type ApiRouteOperation = (
  openApiOperation?: OpenAPIV3_1.OperationObject
) => {
  input: ApiRouteInput<true>;
  output: ApiRouteOutput<true>;
  middleware: (middleware?: ApiRouteHandler) => {
    handler: (callback?: ApiRouteHandler) => ApiRouteOperationDefinition;
  };
  handler: (callback?: ApiRouteHandler) => ApiRouteOperationDefinition;
};

export interface ApiRouteOperationDefinition {
  _config: {
    openApiOperation?: OpenAPIV3_1.OperationObject;
    input?: InputObject;
    output?: readonly OutputObject[];
    middleware?: NextApiHandler;
    handler?: NextApiHandler;
  };
}

export interface ApiRouteParams {
  openApiPath?: OpenAPIV3_1.PathItemObject;
  [ValidMethod.GET]?: ApiRouteOperationDefinition;
  [ValidMethod.PUT]?: ApiRouteOperationDefinition;
  [ValidMethod.POST]?: ApiRouteOperationDefinition;
  [ValidMethod.DELETE]?: ApiRouteOperationDefinition;
  [ValidMethod.OPTIONS]?: ApiRouteOperationDefinition;
  [ValidMethod.HEAD]?: ApiRouteOperationDefinition;
  [ValidMethod.PATCH]?: ApiRouteOperationDefinition;
}
