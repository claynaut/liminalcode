import type { NextApiRequest, NextApiResponse } from 'next';
import { format } from 'date-fns';
import ObjectsToCsv from 'objects-to-csv';

type Response = {
  date: string;
  timestamp: number;
  metal: 'XAU' | 'XAG';
  exchange: 'LBMA';
  currency: 'USD';
  price: number;
  prev_close_price: number;
  ch: number;
  chp: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_21k: number;
  price_gram_20k: number;
  price_gram_18k: number;
};

type Data = Response[] | string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id, output, start, end } = req.query;
  const api_token = req.headers['x-access-token'];
  let json_result = [] as Response[];
  let csv_result = '';

  try {
    if (typeof output === 'undefined') {
      throw new Error('Missing definition for output.');
    }

    let myHeaders = new Headers();
    myHeaders.append('x-access-token', api_token as string);
    myHeaders.append('Content-Type', 'application/json');

    let requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow' as RequestRedirect,
    };

    if (typeof start === 'undefined' || typeof end === 'undefined') {
      // if neither start nor end are defined, use current date
      await fetch(
        `https://www.goldapi.io/api/${id}/USD/${format(
          new Date(),
          'yyyyMMdd'
        )}`,
        requestOptions
      )
        .then((res) => res.json())
        .then((res) => console.log(res))
        .catch((err) => console.log(err));
    } else if (typeof start === 'string' && typeof end === 'string') {
      const start_year = parseInt(start.slice(0, 4));
      const start_month = parseInt(start.slice(4, 6));
      const start_day = parseInt(start.slice(6, 8));
      let start_date = new Date(start_year, start_month - 1, start_day);

      const end_year = parseInt(end.slice(0, 4));
      const end_month = parseInt(end.slice(4, 6));
      const end_day = parseInt(end.slice(6, 8));
      let end_date = new Date(end_year, end_month - 1, end_day);

      for (
        let date = start_date;
        date <= end_date;
        date.setDate(date.getDate() + 1)
      ) {
        // exclude weekends
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          await fetch(
            `https://www.goldapi.io/api/${id}/USD/${format(date, 'yyyyMMdd')}`,
            requestOptions
          )
            .then((res) => res.json())
            .then((res) => {
              if (typeof res.error === 'undefined') {
                json_result.push(res);
                console.log('completed', format(date, 'yyyyMMdd'));
              }
            })
            .catch(() => {});
        }
      }

      const csv = new ObjectsToCsv(json_result);
      csv_result = await csv.toString();
    }

    if (output === 'json') {
      res.status(200).send(json_result);
    } else if (output === 'csv') {
      res.status(200).send(csv_result);
    }
  } catch (err) {
    console.log(err);
    res.status(400).end();
  }
}
