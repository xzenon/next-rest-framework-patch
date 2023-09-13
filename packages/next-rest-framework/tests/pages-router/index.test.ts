import { NextRestFramework } from '../../src';
import {
  DEFAULT_CONFIG,
  getConfig,
  getHTMLForSwaggerUI
} from '../../src/utils';
import { DEFAULT_ERRORS, VERSION, ValidMethod } from '../../src/constants';
import chalk from 'chalk';
import { createApiRouteMocks, resetCustomGlobals } from '../utils';
import { z } from 'zod';
import { type NextRestFrameworkConfig } from '../../src/types';

jest.mock('fs', () => ({
  readdirSync: () => [],
  readFileSync: () => '',
  writeFileSync: () => {}
}));

const config = { apiRoutesPath: 'pages/api' };

beforeEach(() => {
  resetCustomGlobals();
});

it('uses the default config by default', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET,
    path: '/api'
  });

  expect(global.nextRestFrameworkConfig).toEqual(undefined);
  await NextRestFramework().defineCatchAllApiRoute()(req, res);
  expect(global.nextRestFrameworkConfig).toEqual(DEFAULT_CONFIG);
});

it('sets the global config', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET,
    path: '/api'
  });

  const customConfig: NextRestFrameworkConfig = {
    ...config,
    openApiSpecOverrides: {
      info: {
        title: 'Some Title',
        version: '1.2.3'
      },
      paths: {}
    },
    openApiJsonPath: '/foo/bar',
    openApiYamlPath: '/bar/baz',
    swaggerUiPath: '/baz/qux',
    exposeOpenApiSpec: false
  };

  await NextRestFramework(customConfig).defineCatchAllApiRoute()(req, res);
  expect(global.nextRestFrameworkConfig).toEqual(getConfig(customConfig));
});

it('logs init, reserved paths and config changed info', async () => {
  console.info = jest.fn();

  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET,
    path: '/api/openapi.yaml'
  });

  await NextRestFramework(config).defineCatchAllApiRoute()(req, res);

  expect(console.info).toHaveBeenNthCalledWith(
    1,
    chalk.green('Next REST Framework initialized! 🚀')
  );

  expect(console.info).toHaveBeenNthCalledWith(
    2,
    chalk.yellowBright(`Swagger UI: http://localhost:3000/api
OpenAPI JSON: http://localhost:3000/api/openapi.json
OpenAPI YAML: http://localhost:3000/api/openapi.yaml`)
  );

  expect(console.info).toHaveBeenNthCalledWith(
    3,
    chalk.yellowBright('No API spec found, generating openapi.json')
  );

  expect(console.info).toHaveBeenNthCalledWith(
    4,
    chalk.green('API spec generated successfully!')
  );

  expect(console.info).toHaveBeenCalledTimes(4);

  await NextRestFramework({
    ...config,
    swaggerUiPath: '/api/foo/bar',
    openApiJsonPath: '/api/bar/baz',
    openApiYamlPath: '/api/baz/qux'
  }).defineCatchAllApiRoute()(req, res);

  expect(console.info).toHaveBeenNthCalledWith(
    5,
    chalk.green('Next REST Framework config changed, re-initializing!')
  );

  expect(console.info).toHaveBeenNthCalledWith(
    6,
    chalk.yellowBright(`Swagger UI: http://localhost:3000/api/foo/bar
OpenAPI JSON: http://localhost:3000/api/bar/baz
OpenAPI YAML: http://localhost:3000/api/baz/qux`)
  );

  expect(console.info).toHaveBeenCalledTimes(6);

  await NextRestFramework({
    ...config,
    exposeOpenApiSpec: false
  }).defineCatchAllApiRoute()(req, res);

  expect(console.info).toHaveBeenNthCalledWith(
    7,
    chalk.green('Next REST Framework config changed, re-initializing!')
  );

  expect(console.info).toHaveBeenNthCalledWith(
    8,
    chalk.yellowBright(
      `OpenAPI spec is not exposed. To expose it, set ${chalk.bold(
        'exposeOpenApiSpec'
      )} to ${chalk.bold('true')} in the Next REST Framework config.`
    )
  );

  expect(console.info).toHaveBeenCalledTimes(8);
});

it('returns OpenAPI YAML spec', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET,
    path: '/api/openapi.yaml'
  });

  await NextRestFramework(config).defineCatchAllApiRoute()(req, res);

  const yaml = `openapi: 3.0.1
info:
  title: Next REST Framework
  description: This is an autogenerated OpenAPI spec by Next REST Framework.
  version: ${VERSION}
components: {}
paths: {}
`;

  expect(res._getData()).toEqual(yaml);
});

it('returns OpenAPI JSON spec', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET,
    path: '/api/openapi.json'
  });

  await NextRestFramework(config).defineCatchAllApiRoute()(req, res);

  const json = {
    openapi: '3.0.1',
    info: {
      title: 'Next REST Framework',
      description:
        'This is an autogenerated OpenAPI spec by Next REST Framework.',
      version: VERSION
    },
    components: {},
    paths: {}
  };

  expect(res._getJSONData()).toEqual(json);
});

it('returns Swagger UI', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET,
    path: '/api'
  });

  const _config = getConfig({
    ...config,
    swaggerUiConfig: {
      title: 'foo',
      description: 'bar',
      faviconHref: 'baz.ico',
      logoHref: 'qux.jpeg'
    }
  });

  await NextRestFramework(_config).defineCatchAllApiRoute()(req, res);
  const text = res._getData();

  const html = getHTMLForSwaggerUI({
    config: getConfig(_config),
    baseUrl: 'http://localhost:3000'
  });

  expect(text).toEqual(html);
  expect(text).toContain('foo');
  expect(text).toContain('bar');
  expect(text).toContain('baz.ico');
  expect(text).toContain('qux.jpeg');
});

it.each(Object.values(ValidMethod))(
  'works with HTTP method: %p',
  async (method) => {
    const { req, res } = createApiRouteMocks({
      method
    });

    const output = [
      {
        status: 200,
        contentType: 'application/json',
        schema: z.array(z.string())
      }
    ];

    const data = ['All good!'];

    const handler = () => {
      res.json(data);
    };

    await NextRestFramework(config).defineApiRoute({
      GET: {
        output,
        handler
      },
      PUT: {
        output,
        handler
      },
      POST: {
        output,
        handler
      },
      DELETE: {
        output,
        handler
      },
      OPTIONS: {
        output,
        handler
      },
      HEAD: {
        output,
        handler
      },
      PATCH: {
        output,
        handler
      }
    })(req, res);

    expect(res._getJSONData()).toEqual(data);
  }
);

it('returns error for valid methods with no handlers', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.POST
  });

  await NextRestFramework(config).defineApiRoute({
    GET: {
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res.statusCode).toEqual(405);
  expect(res.getHeader('Allow')).toEqual('GET');

  expect(res._getJSONData()).toEqual({
    message: DEFAULT_ERRORS.methodNotAllowed
  });
});

it('works with a valid catch-all-handler', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.POST
  });

  await NextRestFramework(config).defineCatchAllApiRoute({
    POST: {
      output: [
        {
          status: 200,
          contentType: 'application/json',
          schema: z.object({ message: z.string() })
        }
      ],
      handler: () => {
        res.status(200).json({ message: 'All good!' });
      }
    }
  })(req, res);

  expect(res.statusCode).toEqual(200);
  expect(res._getJSONData()).toEqual({
    message: 'All good!'
  });
});

it('returns 404 from a catch-all-handler instead of 405', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET
  });

  await NextRestFramework(config).defineCatchAllApiRoute({
    POST: {
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res.statusCode).toEqual(404);

  expect(res._getJSONData()).toEqual({
    message: DEFAULT_ERRORS.notFound
  });
});

it('returns error for invalid request body', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.POST,
    body: {
      foo: 'bar'
    },
    headers: {
      'content-type': 'application/json'
    }
  });

  await NextRestFramework(config).defineApiRoute({
    POST: {
      input: {
        contentType: 'application/json',
        body: z.object({
          foo: z.number()
        })
      },
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res.statusCode).toEqual(400);

  expect(res._getJSONData()).toEqual({
    message: 'Invalid request body: Expected number, received string'
  });
});

it('returns error for invalid query parameters', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.POST,
    body: {
      foo: 1
    },
    query: {
      foo: 'bar'
    },
    headers: {
      'content-type': 'application/json'
    }
  });

  await NextRestFramework(config).defineApiRoute({
    POST: {
      input: {
        contentType: 'application/json',
        body: z.object({
          foo: z.number()
        }),
        query: z.object({
          foo: z.number()
        })
      },
      output: [],
      handler: () => {}
    }
    // @ts-expect-error: Intentionally invalid.
  })(req, res);

  expect(res.statusCode).toEqual(400);

  expect(res._getJSONData()).toEqual({
    message: 'Invalid query parameters: Expected number, received string'
  });
});

it('returns error for invalid content-type', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.POST,
    body: {
      foo: 'bar'
    },
    headers: {
      'content-type': 'application/xml'
    }
  });

  await NextRestFramework(config).defineApiRoute({
    POST: {
      input: {
        contentType: 'application/json',
        body: z.string()
      },
      output: [],
      handler: () => {}
    }
  })(req, res);

  expect(res.statusCode).toEqual(415);

  expect(res._getJSONData()).toEqual({
    message: DEFAULT_ERRORS.invalidMediaType
  });
});

it.each([
  {
    definedContentType: 'application/json',
    requestContentType: 'application/json'
  },
  {
    definedContentType: 'application/json',
    requestContentType: 'application/json; charset=utf-8'
  },
  {
    definedContentType: 'application/form-data',
    requestContentType: 'application/form-data; name: "foo"'
  }
])(
  'works with different content types: %s',
  async ({ definedContentType, requestContentType }) => {
    const { req, res } = createApiRouteMocks({
      method: ValidMethod.POST,
      body: {
        foo: 'bar'
      },
      headers: {
        'content-type': requestContentType
      }
    });

    await NextRestFramework(config).defineApiRoute({
      POST: {
        input: {
          contentType: definedContentType,
          body: z.object({
            foo: z.string()
          })
        },
        output: [
          {
            status: 201,
            contentType: 'application/json',
            schema: z.object({
              foo: z.string()
            })
          }
        ],
        handler: () => {
          res.json({ foo: 'bar' });
        }
      }
    })(req, res);

    expect(res.statusCode).toEqual(200);
    expect(res._getJSONData()).toEqual({ foo: 'bar' });
  }
);

it('returns a default error response', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET
  });

  console.error = jest.fn();

  await NextRestFramework(config).defineApiRoute({
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      }
    }
  })(req, res);

  expect(res._getJSONData()).toEqual({
    message: DEFAULT_ERRORS.unexpectedError
  });
});

it('works with an error handler', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET
  });

  console.log = jest.fn();

  await NextRestFramework({
    ...config,
    errorHandler: () => {
      console.log('foo');
      res.status(500).json({ message: 'foo' });
    }
  }).defineApiRoute({
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      }
    }
  })(req, res);

  expect(console.log).toBeCalledWith('foo');
  expect(res.statusCode).toEqual(500);

  expect(res._getJSONData()).toEqual({
    message: 'foo'
  });
});

it('suppresses errors in production mode by default', async () => {
  const { req, res } = createApiRouteMocks({
    method: ValidMethod.GET
  });

  console.error = jest.fn();
  process.env = { ...process.env, NODE_ENV: 'production' };

  await NextRestFramework(config).defineApiRoute({
    GET: {
      output: [],
      handler: () => {
        throw Error('Something went wrong');
      }
    }
  })(req, res);

  expect(console.error).toBeCalledWith(
    chalk.red(
      'Next REST Framework encountered an error - suppressed in production mode.'
    )
  );
});
