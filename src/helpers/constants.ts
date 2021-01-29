const db =
  process.env.NODE_ENV === 'production'
    ? process.env.DEV_DB
    : process.env.PROD_DB;
const __PROD__ = process.env.NODE_ENV === 'production';
export { db, __PROD__ };
