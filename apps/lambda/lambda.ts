import serverlessHttp from 'serverless-http';

import app from './src';

export const discordHandler = serverlessHttp(app);
