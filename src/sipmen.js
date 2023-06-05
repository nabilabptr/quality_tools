import * as path from 'path'
import XLSX from './excel.js';
import logger from './logger.js';
import puppeteer from 'puppeteer';
import { fromCsv } from "./data.js";
import { delay, asyncForEach } from "./utils.js";
import * as control from "./control.js"
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import chalkPipe from 'chalk-pipe';

inquirer
  .prompt([
    /* Pass your questions in here */
  ])
  .then((answers) => {
    // Use user feedback for... whatever!!
  })
  .catch((error) => {
    if (error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
    } else {
      // Something else went wrong
    }
  });

/**
 * Environment Variables
 */
dotenv.config();


const DISTRIBUSI_URL = `${process.env.SIPMEN_URL}/go/sipmen32/distribusi`
const DELETE_BUTTON = 'a[class="mt-6 px-2 py-1 text-xs font-medium leading-5 text-white transition-colors duration-150 bg-red-600 border border-transparent rounded-lg active:bg-red-600 hover:bg-red-700 focus:outline-none focus:shadow-outline-green"]'


/**
 * 
 * @param {*} page 
 */
export const checkError = async (page) => {
  const loginError = await page.$eval('ul.text-sm.text-red-600.space-y-1.mt-2 > li', el => el.textContent)
    .catch(() => false);

  if (loginError) throw Error(loginError.trim());

  const pengambilanValidationError = await page.$eval('div.bg-red-100.rounded-lg.shadow-md.py-5.px-6.mt-4.text-base.text-red-700', el => el.textContent)
    .catch(() => false);

  if (pengambilanValidationError) throw Error(pengambilanValidationError.trim());
}


/**
 * 
 * @param {*} page 
 */
export const login = async (page) => {
  // login

  logger.info("Login")

  await page.goto(`${process.env.SIPMEN_URL}/login`);

  await page.waitForSelector('#email');

  await page.waitForSelector('#password');

  await page.type('#email', process.env.SIPMEN_USERNAME);

  await page.type('#password', process.env.SIPMEN_PASSWORD);

  await page.$eval('form', form => form.submit());

  await page.waitForNavigation();

  await checkError(page).catch(err => {
    logger.error(err.message)

    logger.info('Clossing Browser...')

    process.exit()
  })

  // await page.close()

  logger.info("Berhasil Login")
}


/**
 * 
 * @param {*} page 
 */
export const pengambilan = async (page) => {

  // id_batch
  // nama_petugas
  // tanggal_ambil (format: dd/mm/yyyy)
  const data = await fromCsv(path.join(process.cwd(), "/data/pengambilan.csv"));

  console.log(data)

  for (let i = 0; i < data.length; i++) {
    const batch = data[i];

    logger.info(`Input Pengambilan id batch : ${batch.id_batch}`)

    await page.goto(`${process.env.SIPMEN_URL}/go/sipmen32/pengambilan`);

    await page.waitForSelector('#id_batch');

    await page.type('#id_batch', batch.id_batch);

    await page.keyboard.press('Enter')

    await delay(500)

    await page.waitForSelector('#select2-op_entry-container')

    await page.click("#select2-op_entry-container")

    const searhMitra = await page.$$("input.select2-search__field")

    if (!searhMitra) continue;

    await searhMitra[0].type(batch.nama_petugas)

    await page.keyboard.press('Enter')

    await page.waitForSelector('#a_tgl')

    await page.type('#a_tgl', batch.tanggal_ambil)

    await page.$eval('form', form => form.submit());

    await page.waitForNavigation();

    try {
      await checkError(page)

    } catch (error) {
      logger.error(`Gagal Input pengambilan id_batch : ${batch.id_batch}`)

      logger.error(error.message);

      continue;
    }
    logger.info(`Berhasil Input Pengambilan id batch : ${batch.id_batch}`)
  }
}


/**
 * 
 * @param {*} page 
 */
export const pengembalian = async (page) => {
  const RUANG_OLAH = '49';

  // id_sls
  // tanggal_kembali (format: dd/mm/yyyy)
  // clean_k
  // dok_k
  const data = await fromCsv(path.join(process.cwd(), "/data/pengembalian.csv"));

  // Pengembalian

  for (let i = 0; i < data.length; i++) {
    const sls = data[i];

    logger.info(`Input Pengembalian id sls : ${sls.id_sls}`)

    if (page.url() != DISTRIBUSI_URL) {
      await page.goto(DISTRIBUSI_URL);
    }

    const input = await page.waitForSelector('input[type="search"]');

    await input.type(sls.id_sls)

    await page.waitForSelector('a.bg-green-600')

    const buttonPengembalian = await page.$$("a.bg-green-600")

    await buttonPengembalian[0].click()

    await page.waitForSelector('input#k_tgl')

    await page.type('input#k_tgl', sls.tanggal_kembali)

    await page.waitForSelector('input#k_s_kc')

    await page.type('input#k_s_kc', sls.clean_k)

    await page.waitForSelector('input#k_s_kw')

    await page.type('input#k_s_kw', '0')

    await page.waitForSelector('input#k_s_ke')

    await page.type('input#k_s_ke', '0')

    await page.waitForSelector('input#k_s_xkc')

    await page.type('input#k_s_xkc', '0')

    await page.waitForSelector('input#k_s_xkw')

    await page.type('input#k_s_xkw', '0')

    await page.waitForSelector('input#k_s_xke')

    await page.type('input#k_s_xke', '0')

    await page.waitForSelector('select#k_lok')

    await page.select('select#k_lok', RUANG_OLAH)

    await page.waitForSelector('input#a_jd_k')

    await page.type('input#a_jd_k', sls.dok_k)

    await page.waitForSelector('input#a_jd_xk')

    await page.type('input#a_jd_xk', '0')

    await page.$eval('form', form => form.submit());

    await page.waitForNavigation();

    try {
      await checkError(page)

    } catch (error) {
      logger.error(`Gagal Input pengembalian id_sls : ${sls.id_sls}`)

      logger.error(error.message);

      continue;
    }

    logger.info(`Berhasil Input Pengembalian id sls : ${sls.id_sls}`)

  }
}


/**
 * 
 * @param {*} browser 
 * @param {*} items 
 */
const hapus_record = async (page, id_hapus, i) => {
  const input = await page.waitForSelector('input[type="search"]');

  logger.info(`Hapus record ke-${i + 1}`)

  await input.click({ clickCount: 3 })

  await input.press('Backspace')

  await input.type(id_hapus)

  const buttonDelete = await page.$$(DELETE_BUTTON)

  await buttonDelete[0].click()

  await page.waitForSelector('button.py-2')

  await page.click('button.py-2')

  await page.waitForNavigation()

  try {
    await checkError(page)

  } catch (error) {
    logger.error("Something's wrong!")

    logger.error(error.message);
  }
}

/**
 * 
 * @param {*} browser 
 */
export const hapus_all_record = async (page) => {

  const questions = [
    {
      type: 'input',
      name: 'id_hapus',
      message: "Masukkan ID yang akan dihapus",
    }
  ]

  await inquirer.prompt(questions).then(async(answers) => {

    const id_hapus = answers.id_hapus

    logger.info(`ID yang akan dihapus: ${id_hapus}`)

    if (page.url != DISTRIBUSI_URL) {
      logger.info("Path not match")
  
      await page.goto(DISTRIBUSI_URL);
    }
  
    const input = await page.waitForSelector('input[type="search"]');
  
    logger.info(`Hapus record ${id_hapus}`)
  
    await input.type(id_hapus)
  
    const buttonDelete = await page.$$(DELETE_BUTTON)
  
    const n_record = buttonDelete.length
  
    if (n_record) {
      logger.info(`Terdapat ${n_record} record`)
  
      for (let i = 0; i < n_record; i++) {
        await hapus_record(page, id_hapus, i)
  
        logger.info(`Berhasil Hapus Record ke-${i + 1}`)
      }
    } else {
      logger.info("Record yang dicari kosong")
    }
  
    logger.info("Berhasil hapus semua record")
  });
  

}

/**
 * launch sipmen browser
 * 
 * @param {*} callback 
 */
export const launch = async (callback) => {
  logger.info('Launching Browser...')

  const browser = await puppeteer.launch({ headless: process.env.HEADLESS.toLowerCase() === 'true' });

  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(0);

  await login(page).catch((error) => {
    logger.error(error.message);

    process.exit();
  });

  await callback(page);

  logger.info("All Done!")

  logger.info('Clossing Browser...')

  await browser.close()
};
