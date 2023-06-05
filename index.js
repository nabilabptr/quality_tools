import * as path from 'path'
import XLSX from './src/excel.js';
import logger from './src/logger.js';
import puppeteer from 'puppeteer';
import { fromCsv } from "./src/data.js";
import { delay, asyncForEach } from "./src/utils.js";
import * as control from "./src/control.js"
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import chalkPipe from 'chalk-pipe';

/**
 * Environment Variables
 */
dotenv.config();

/**
 * 
 * @param {*} page 
 */
export const checkError = async (page) => {
  const loginError = await page.$eval('span.kc-feedback-text', el => el.textContent)
    .catch(() => false);

  if (loginError) throw Error(loginError.trim());
}


/**
 * 
 * @param {*} page 
 */
export const login = async (page) => {

  logger.info("Login")

  await page.goto(`${process.env.WEB_URL}`);

  await page.waitForSelector('.overlay-right > .ghost:nth-child(3)');

  await page.click('.overlay-right > .ghost:nth-child(3)')

  await page.waitForSelector('#username');

  await page.waitForSelector('#password');

  await page.type('#username', process.env.SSO_USERNAME);

  await page.type('#password', process.env.SSO_PASSWORD);

  await page.$eval('form', form => form.submit());

  await page.waitForNavigation();

  await checkError(page).catch(err => {
    logger.error(err.message)

    logger.info('Clossing Browser...')

    process.exit()
  })

  logger.info("Berhasil Login")
}

async function main() {
  logger.info('Launching Browser...')

  const browser = await puppeteer.launch({ headless: process.env.HEADLESS.toLowerCase() === 'true' });

  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(0);

  await login(page).catch((error) => {
    logger.error(error.message);

    process.exit();
  });

  await page.goto(`${process.env.WEB_URL}/user/index`);

  const data = await fromCsv(path.join(process.cwd(), "/data/mitra.csv"));

  console.log(data);

  await page.waitForSelector('a.btn-info');

  await page.click('a.btn-info');

  for (let i = 0; i < data.length; i++) {
    const petugas = data[i];

    delay(1000);

    logger.info(`Tambah petugas : ${petugas.username}`)

    let petugas_level = '0'

    if (petugas.level == 'OPERATOR KABUPATEN/KOTA') {
      petugas_level = '9'
    } else if (petugas.level == 'PEMANTAU KABUPATEN/KOTA') {
      petugas_level = '8'
    }

    console.log(petugas_level);

    if (petugas.status == "mitra") {

      await page.waitForSelector('input#MUser_is_sync_1');

      await page.click('input#MUser_is_sync_1');

      await page.waitForSelector('input#MUser_username');

      await page.type('input#MUser_username', petugas.username);

      await page.waitForSelector('input#MUser_password');

      await page.type('input#MUser_password', "ST2023");

      await page.waitForSelector('input#MUser_nama');

      await page.type('input#MUser_nama', petugas.nama);

      await page.waitForSelector('input#MUser_email');

      await page.type('input#MUser_email', petugas.email);

      await page.waitForSelector('input#MUser_satker');

      await page.type('input#MUser_satker', "Mitra BPS Kabupaten Kepulauan Sula");

    } else if (petugas.status == "organik") {

      await page.waitForSelector('input#input-nip');

      await page.type('input#input-nip', petugas.username);

      page.keyboard.press('Enter')

      delay(1000);

      await page.waitForSelector('input#MUser_is_sync_0');

      await page.click('input#MUser_is_sync_0');

    }

    await page.waitForSelector('select#MUser_level');

    await page.select('select#MUser_level', petugas_level);

    await delay(1000);

    await page.$eval('form', form => form.submit());

    await page.waitForNavigation();

    logger.info(`Selesai menambahkan petugas : ${petugas.username}`)
  }

  logger.info(`Semua petugas berhasil ditambahkan, browser akan ditutup`);

  logger.info('Clossing Browser...');

  process.exit();
}

main();