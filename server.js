import express, { json } from "express";
import ViteExpress from "vite-express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import * as docx from "docx";
import html_to_pdf from "html-pdf-node";
import TelegramApi from "node-telegram-bot-api";
import {
  Paragraph,
  patchDocument,
  PatchType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import { error, log } from "console";

const token = "6916424872:AAGsXfL8qqVQ62ynk1KPysO9--HOyGplzCI";

const app = express();

app.use(express.json());

//Чтение с файла

let bd;

process.env.NTBA_FIX_350 = true;

async function readBase() {
  fs.readFile("./base.json", (err, data) => {
    bd = JSON.parse(data);
    console.log(`Base: ${bd}`);
  });
}

readBase();

// Бот-----
const bot = new TelegramApi(token, {
  polling: true,
  request: {
    agentOptions: {
      keepAlive: true,
      family: 4,
    },
  },
});

bot.on("polling_error", console.log);

bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  if (bd.includes(chatId)) {
    bot.sendMessage(chatId, "Вы уже получаете анкеты!");
    return;
  }
  if (text === "/start") {
    bot.sendMessage(
      chatId,
      "Добро пожаловать. Этот бот рассылает анкеты сосикателей компании ССК. Введите пароль для доступа к боту"
    );

    return;
  }
  if (text === "pass1234") {
    bd.push(chatId);
    const saveBd = JSON.stringify(bd);
    fs.writeFile("./base.json", saveBd, (data) => {});
    bot.sendMessage(chatId, "Пароль верный!");
  }
});

//Создание файла----

//Формирует строку таблицы. Принимает массив с данными,
// и массив значений ширины ячеек в процентах (вязл из ворда)

function getRelativeString(data) {
  let string = "";
  if (data.family.relatives.length === 0) {
    string = `<tr style="border: 2px solid black; border-top: none"><td style='border: none'>Данные не указаны</td></tr>`;
    return string;
  }
  data.family.relatives.forEach((el) => {
    const itemString = `<tr style="border: 2px solid black; border-top: none">
    <td style="border: 2px solid black; border-top: none">${el.degree.value}</td>
  <td style="border: 2px solid black; border-top: none">${el.fullName.value}</td>
  <td style="border: 2px solid black; border-top: none">${el.birthday.value}</td>
  <td style="border: 2px solid black; border-top: none">${el.workPlace.value}</td>
  </tr>`;
    string += itemString;
    // console.log(string);
  });
  return string;
}

function getEducationBasic(data) {
  let string = "";
  if (data.education.basic.length === 0) {
    string = `<tr style="border: 2px solid black; border-top: none"><td style='border: none'>Данные не указаны</td></tr>`;
    return string;
  }
  data.education.basic.forEach((el) => {
    const itemString = `<tr style="border: 2px solid black; border-top: none">
    <td
      style="width: 13, 5%; border: 2px solid black; border-top: none"
    >
      ${el.dateStart.value}
    </td>
    <td style="width: 11.5%; border: 2px solid black; border-top: none">
    ${el.dateEnd.value}
    </td>
    <td
      style="width: 35, 4%; border: 2px solid black; border-top: none"
    >
    ${el.organizationName.value}
    </td>
    <td style="width: 18.7%; border: 2px solid black; border-top: none">
    ${el.faculty.value}
    </td>
    <td style="width: 20.7%; border: 2px solid black; border-top: none">
    ${el.speciality.value}
    </td>
  </tr>`;
    string += itemString;
    // console.log(string);
  });
  return string;
}

function getEducationAdditionalString(data) {
  let string = "";
  if (data.education.additional.length === 0) {
    string = `<tr style="border: 2px solid black; border-top: none"><td style='border: none'>Данные не указаны</td></tr>`;
    return string;
  }
  data.education.additional.forEach((el) => {
    const itemString = `<tr style="border: 2px solid black; border-top: none">
    <td
      style="width: 13, 5%; border: 2px solid black; border-top: none"
    >
      ${el.dateStart.value}
    </td>
    <td style="width: 11.5%; border: 2px solid black; border-top: none">
    ${el.dateEnd.value}
    </td>
    <td
      style="width: 35, 4%; border: 2px solid black; border-top: none"
    >
    ${el.organizationName.value}
    </td>
    <td style="width: 18.7%; border: 2px solid black; border-top: none">
    ${el.faculty.value}
    </td>
  </tr>`;
    string += itemString;
    // console.log(string);
  });
  return string;
}

function getWorkString(data) {
  let string = "";
  if (data.exp.work.length === 0) {
    string = `<tr style="border: 2px solid black; border-top: none"><td style='border: none'>Данные не указаны</td></tr>`;
    return string;
  }
  data.exp.work.forEach((el) => {
    const itemString = `<tr style="border: 2px solid black; border-top: none">
    <td
      style="width: 13, 5%; border: 2px solid black; border-top: none"
    >
      ${el.dateStart.value}
    </td>
    <td style="width: 11.5%; border: 2px solid black; border-top: none">
    ${el.dateEnd.value}
    </td>
    <td
      style="width: 35, 4%; border: 2px solid black; border-top: none"
    >
    ${el.organizationName.value}
    </td>
    <td style="width: 18.7%; border: 2px solid black; border-top: none">
    ${el.place.value}
    </td>
    <td style="width: 20.7%; border: 2px solid black; border-top: none">
    ${el.jobTitle.value}
    </td>
  </tr>`;
    string += itemString;
    // console.log(string);
  });
  return string;
}

let relativeString = "";
let educationBasicString = "";
let educationAdditionalString = "";
let workString = "";

async function getPdf(file, options, data, fileName) {
  return new Promise(async (resolve, reject) => {
    console.log("1");
    await html_to_pdf.generatePdf(file, options).then((pdfBuffer) => {
      fs.writeFile(`${fileName}.pdf`, pdfBuffer, () => {
        resolve();
      });
    });
    console.log("2");
  });
}

async function sendMessages(fileName, data) {
  return new Promise(async (resolve, reject) => {
    console.log("3");
    // console.log("Отправка файлов");
    await bd.forEach(async (chatId) => {
      // console.log("Отправка в цикле");
      await bot
        .sendDocument(chatId, `${fileName}.pdf`)
        .catch((error) => reject());
      await bot
        .sendMessage(
          chatId,
          `${data.personal.name.value} ${data.personal.surname.value} ${data.personal.lastName.value} отправил анкету!`
        )
        .catch((error) => reject());
    });
    console.log("4");
    // console.log("Отправка после цикла");
    resolve();
  });
}

async function sendFile(req, res) {
  const data = req.body;
  const fileName = `./${data.personal.name.value}_${data.personal.lastName.value}`;

  relativeString = getRelativeString(data);
  educationBasicString = getEducationBasic(data);
  educationAdditionalString = getEducationAdditionalString(data);
  workString = getWorkString(data);
  let options = {
    format: "A4",
    margin: { bottom: 100, top: 100, left: 70, right: 70 },
    printBackground: true,
  };

  let file = {
    content: `<html lang="ru">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif">
      <div
        style="
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        "
      >
        <div
          style="
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: start;
          "
        >
          <img src="logo.png" style="width: 100px; align-self: center" />
          <h1
            style="
              align-self: center;
              margin-bottom: 0;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 13pt;
            "
          >
            АНКЕТА СОИСКАТЕЛЯ
          </h1>
          <p
            style="
              align-self: center;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11pt;
            "
          >
            на потенциальное трудоустройство в АО «ССК»
          </p>
  
          <!-- Начало таблицы -->
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-bottom: none;
            "
          >
            <tr style="border-top: 2px solid black">
              <td
                style="
                  width: 13.5%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Дата заполнения
              </td>
              <td style="width: 11.5%; border: 2px solid black">
                ${data.start.dateComlition.value}
              </td>
              <td
                style="
                  width: 8.9%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Направление
              </td>
              <td style="width: 15.2%; border: 2px solid black">
                ${data.start.vacancy.value}
              </td>
              <td
                style="
                  width: 23.2%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Желаемый филиал труда
              </td>
              <td style="width: 27.5%; border: 2px solid black">
                ${data.start.branch.value}
              </td>
            </tr>
          </table>
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border: none;
            "
          >
            <tr style="border: none; height: 20px; border-right: 2px solid black">
              <td
                style="
                  border: none;
                  height: 20px;
                  border-right: 2px solid black;
                  border-left: 2px solid black;
  
                  width: 100%;
                "
              ></td>
            </tr>
          </table>
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-bottom: none;
            "
          >
            <tr style="border: 2px solid black">
              <td
                style="
                  width: 33.3%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Фамилия
              </td>
              <td
                style="
                  width: 33.3%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Имя
              </td>
              <td
                style="
                  width: 33.3%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Отчество
              </td>
            </tr>
            <tr style="border: 2px solid black">
              <td style="width: 33.3%; border: 2px solid black">
                ${data.personal.lastName.value}
              </td>
              <td style="width: 33.3%; border: 2px solid black">
                ${data.personal.name.value}
              </td>
              <td style="width: 33.3%; border: 2px solid black">
                ${data.personal.surname.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border: none;
            "
          >
            <tr style="border: none; height: 20px; border-right: 2px solid black">
              <td
                style="
                  border: none;
                  height: 20px;
                  border-right: 2px solid black;
                  border-left: 2px solid black;
  
                  width: 100%;
                "
              ></td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-bottom: none;
            "
          >
            <tr style="border: 2px solid black">
              <td
                style="
                  width: 33.9%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Дата рождения
              </td>
              <td
                style="
                  width: 66%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Место рождения
              </td>
            </tr>
            <tr style="border: 2px solid black">
              <td style="width: 33.9%; border: 2px solid black">
                ${data.personal.birthday.value}
              </td>
              <td style="width: 66%; border: 2px solid black">
                ${data.personal.birthPlace.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-bottom: none;
              border-top: none;
              border-bottom: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 33.9%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                  border-bottom: none;
                "
              >
                Паспорт
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-bottom: none;
              border-top: none;
            "
          >
            <tr style="border-top: none">
              <td
                style="
                  width: 13.5%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Серия
              </td>
              <td style="width: 11.5%; border: 2px solid black; border-top: none">
                ${data.personal.passSeries.value}
              </td>
              <td
                style="
                  width: 8.9%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Номер
              </td>
              <td style="width: 15.2%; border: 2px solid black; border-top: none">
                ${data.personal.passNumber.value}
              </td>
              <td
                style="
                  width: 23.2%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Дата выдачи
              </td>
              <td style="width: 27.5%; border: 2px solid black; border-top: none">
                ${data.personal.passDate.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 13.5%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Кем выдан
              </td>
              <td style="width: 86.4%; border: 2px solid black; border-top: none">
                ${data.personal.passPlace.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 13.4%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                ИНН
              </td>
              <td style="width: 19.9%; border: 2px solid black; border-top: none">
                ${data.personal.INN.value}
              </td>
              <td
                style="
                  width: 13.5%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                СНИЛС
              </td>
              <td style="width: 50.8%; border: 2px solid black; border-top: none">
                ${data.personal.SNILS.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 33.9;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Электронная почта (E-mail)
              </td>
              <td
                style="
                  width: 26.5%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Мобильный телефон
              </td>
  
              <td
                style="
                  width: 39.4%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Дополнительный контактный телефон
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td style="width: 33.9; border: 2px solid black; border-top: none">
                ${data.personal.email.value}
              </td>
              <td style="width: 26.5%; border: 2px solid black; border-top: none">
                ${data.personal.phoneNumber.value}
              </td>
  
              <td style="width: 39.4%; border: 2px solid black; border-top: none">
                ${data.personal.morePhoneNumber.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Семейное положение:
              </td>
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Дети и их возраст:
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.family.familyStatus.value}
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.family.children.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Адрес регистрации:
              </td>
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Адрес проживания:
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.family.registrationAddress.value}
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.family.residentialAddress.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 44.1%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Наличие водительского удостоверения:
              </td>
              <td style="width: 5.9%; border: 2px solid black; border-top: none">
                ${data.family.driveLicense.value}
              </td>
  
              <td
                style="
                  width: 23.2%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Категория:
              </td>
              <td style="width: 6.7%; border: 2px solid black; border-top: none">
                ${data.family.driveCategory.value}
              </td>
              <td
                style="
                  width: 6.9%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Стаж:
              </td>
              <td style="width: 13.8%; border: 2px solid black; border-top: none">
                ${data.family.driveExperience.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Отношение к воинской службе:
              </td>
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Пребывание за границей (страна, срок, цель):
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="width: 50%; border: 2px solid black; border-top: none"
              ></td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.family.abroad.value}
              </td>
            </tr>
  
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Привлекались ли к административной, уголовной отвественности,
                наличие судимости:
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.family.criminal.value}
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="height: 20px; border: 2px solid black; border-top: none">
              <td
                style="
                  height: 20px;
                  border: 2px solid black;
                  border-top: none;
                  width: 100%;
                "
              ></td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
              border-bottom: 2px solid black;
            "
          >
            <tr style="border: 2px solid black; border: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Образование (среднее, средне - специальное, высшее образование)
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td style="width: 13.5%; border: 2px solid black; border-top: none">
                Дата поступления
              </td>
              <td style="width: 11.5%; border: 2px solid black; border-top: none">
                Дата окончания
              </td>
              <td
                style="width: 35, 4%; border: 2px solid black; border-top: none"
              >
                Наименование учебного заведения
              </td>
              <td style="width: 18.7%; border: 2px solid black; border-top: none">
                Факультет
              </td>
              <td style="width: 20.7%; border: 2px solid black; border-top: none">
                Специальность
              </td>
            </tr>
            ${educationBasicString}
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Дополнительное образование (курсы повышения квалификации,
                переподготовки)
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td style="width: 13.5%; border: 2px solid black; border-top: none">
                Дата поступления
              </td>
              <td style="width: 11.5%; border: 2px solid black; border-top: none">
                Дата окончания
              </td>
              <td
                style="width: 35, 4%; border: 2px solid black; border-top: none"
              >
                Наименование учебного заведения
              </td>
              <td style="width: 39.4%; border: 2px solid black; border-top: none">
                Название курса/семинара
              </td>
            </tr>
            ${educationAdditionalString}
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Ваши ближайшие родственники (муж/жена, мать, отец, родные братья и
                сестры):
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td style="width: 13.5%; border: 2px solid black; border-top: none">
                Степень родства
              </td>
              <td style="width: 35.6%; border: 2px solid black; border-top: none">
                ФИО
              </td>
              <td style="width: 11.3%; border: 2px solid black; border-top: none">
                Дата рождения
              </td>
              <td style="width: 39.4%; border: 2px solid black; border-top: none">
                Место работы, должность, место проживания
              </td>
            </tr>
            ${relativeString}
          </table>
        </div>
      </div>
  
      <div style="page-break-after: always; color: white">разрыв</div>
  
      <div
        style="
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        "
      >
        <div
          style="
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: start;
          "
        >
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                "
              >
                Есть ли у Вас родственники работающие в Компании (укажите фамилию,
                имя, отчество)?
              </td>
              <td style="width: 50%; border: 2px solid black">
                ${data.moreInfo.relatives.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  border-top: none;
                  background-color: #d8d8d8;
                "
              >
                Являетесь ли Вы учредителем, совладельцем, руководителем
                какой-либо Компании? Являетесь ли ИП? Были ли ранее?
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.moreInfo.business.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  border-top: none;
                  background-color: #d8d8d8;
                "
              >
                Укажите Ваши умения, увлечения, интересы и др. информацию
                представляющую интерес для Компании:
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.moreInfo.hobby.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  border-top: none;
                  background-color: #d8d8d8;
                "
              >
                Готовы ли вы работать в других городах?
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.moreInfo.otherCity.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  border-top: none;
                  background-color: #d8d8d8;
                "
              >
                Причина увольнения с прежнего места работы?
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.moreInfo.dismissal.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  border-top: none;
                  background-color: #d8d8d8;
                "
              >
                Ваша зарплата на сегодняшний день (до вычета подоходного налога)?
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.moreInfo.salaryNow.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  border-top: none;
                  background-color: #d8d8d8;
                "
              >
                Желаемая зарплата на новом месте (до вычета подоходного налога)?
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.moreInfo.salaryWants.value}
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 50%;
                  border: 2px solid black;
                  border-top: none;
                  background-color: #d8d8d8;
                "
              >
                С какого времени вы можете приступить к работе?
              </td>
              <td style="width: 50%; border: 2px solid black; border-top: none">
                ${data.moreInfo.workStart.value}
              </td>
            </tr>
  
            <tr style="border: 2px solid black; height: 20px; border-top: none">
              <td style="width: 50%; border: none"></td>
              <td style="width: 50%; border: none"></td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                "
              >
                Опыт работы (за последние 10 лет, включая учебу и работу по
                договору подряда)
              </td>
            </tr>
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td style="width: 13.5%; border: 2px solid black; border-top: none">
                Дата поступления
              </td>
              <td style="width: 11.5%; border: 2px solid black; border-top: none">
                Дата окончания
              </td>
              <td style="width: 35.5%; border: 2px solid black; border-top: none">
                Наименование оранизации
              </td>
              <td style="width: 18.7%; border: 2px solid black; border-top: none">
                Местонахождение
              </td>
              <td style="width: 20.7%; border: 2px solid black; border-top: none">
                Должность
              </td>
            </tr>
            ${workString}
          </table>
  
          <table
            style="
              border-collapse: collapse;
              width: 100%;
              font-weight: bold;
              text-align: center;
              border: 2px solid black;
              font-size: 9pt;
              font-family: Arial, Helvetica, sans-serif;
              border-top: none;
            "
          >
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  background-color: #d8d8d8;
                  border-top: none;
                  font-size: 11pt;
                  text-align: left;
                "
              >
                *Направляя анкету:
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  border-top: none;
                  font-size: 11pt;
                  text-align: left;
                  font-weight: normal;
                  border-bottom-color: #d8d8d8;
                "
              >
                - Я подтверждаю, что информация, изложенная в настоящей анкете,
                является достоверной и подлинной, а также действительной на
                настоящий момент.
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  border-top: none;
                  font-size: 11pt;
                  text-align: left;
                  font-weight: normal;
                  border-bottom-color: #d8d8d8;
                "
              >
                - Об изменении учетных данных (семейного положения, места
                проживания и пр.) обязуюсь незамедлительно сообщать в Управление
                кадров.
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  border-top: none;
                  font-size: 11pt;
                  text-align: left;
                  font-weight: normal;
                  border-bottom-color: #d8d8d8;
                "
              >
                - С правилами внутреннего трудового распорядка Компании правилами
                пожарной безопасности ознакомлен.
              </td>
            </tr>
            <tr style="border: 2px solid black; border-top: none">
              <td
                style="
                  width: 100%;
                  border: 2px solid black;
                  border-top: none;
                  font-size: 11pt;
                  text-align: left;
                  font-weight: normal;
                "
              >
                - Я передал эту информацию добровольно и не возражаю против
                установления ее достоверности.
              </td>
            </tr>
          </table>
        </div>
      </div>
  
      <div style="page-break-before: always; color: white">Разрыв</div>
      <div
        style="
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        "
      >
        <div style="width: 100%">
          <div style="width: 100%; display: flex; flex-direction: column">
            <p
              style="
                text-align: right;
                width: 100%;
                font-weight: bold;
                font-size: 11pt;
              "
            >
              Генеральному директору<br />
              АО «Сибирская Сервисная Компания»<br />
              Александру Николаевичу Котову
            </p>
            <p style="align-self: flex-end; margin-bottom: 0px">
              от ______________________
            </p>
            <p style="align-self: flex-end; margin-bottom: 0px">
              _________________________
            </p>
            <p style="align-self: flex-end; margin-bottom: 0px">
              _________________________
            </p>
            <p style="align-self: flex-end; margin-bottom: 0px">
              _________________________
            </p>
            <p style="align-self: flex-end">(ФИО, паспортные данные)</p>
  
            <h1 style="font-weight: bold; font-size: 11pt; align-self: center">
              СОГЛАСИЕ
            </h1>
  
            <p style="margin: 0; text-indent: 40px">
              Настоящим, свободно, своей волей и в своем интересе в соответствии
              со ст. 9 Федерального закона от 27.07.2006 N 152-ФЗ «О персональных
              данных» выражаю согласие АО «ССК» ИНН 0814118403, ОГРН
              1028601792878, зарегистрированному по адресу: 125284, г. Москва,
              Ленинградский проспект, дом 31а, стр. 1, на обработку моих
              персональных данных, то есть на совершение любых действий (операций)
              или совокупности действий (операций), совершаемых с использованием
              средств автоматизации или без использования таких средств с
              персональными данными, включая сбор, запись, систематизацию,
              накопление, хранение, уточнение (обновление, изменение), извлечение,
              использование, передачу (распространение, предоставление, доступ),
              обезличивание, блокирование, удаление, уничтожение персональных
              данных.
            </p>
  
            <p style="margin: 0; text-indent: 40px">
              Согласие на обработку персональных данных дается в отношении
              следующих анкетных сведений:
              <span style="text-decoration: underline; font-style: oblique">
                фамилии, имени, отчества и иных паспортных данных, включая
                фотографию, ИНН, СНИЛС, контактных телефонов, адресов электронной
                почты, адреса фактического проживания, водительского
                удостоверения, сведений о воинском учете, образовании,
                квалификации, профессиональных и прикладных навыков.
              </span>
            </p>
  
            <p style="margin: 0; text-indent: 40px">
              Согласие дается в целях моего трудоустройства в АО «ССК» и действует
              с момента представления и до дня официального оформления в качестве
              работника АО «ССК» или отказа в трудоустройстве. Согласие может быть
              отозвано мной и ранее срока трудоустройства или отказа в таковом при
              представлении Работодателю заявления в простой письменной форме в
              соответствии с требованиями законодательства Российской Федерации.
            </p>
  
            <table
              style="
                border-collapse: collapse;
                width: 100%;
                font-weight: bold;
                text-align: center;
                border: 2px solid black;
                font-size: 9pt;
                font-family: Arial, Helvetica, sans-serif;
                border-bottom: none;
                margin-top: 50px;
              "
            >
              <tr style="border: 2px solid black; height: 35px">
                <td
                  style="
                    width: 33.3%;
                    border: 2px solid black;
                    background-color: #d8d8d8;
                  "
                >
                  Дата
                </td>
                <td
                  style="
                    width: 33.3%;
                    border: 2px solid black;
                    background-color: #d8d8d8;
                  "
                >
                  Фамилия И.О.
                </td>
                <td
                  style="
                    width: 33.3%;
                    border: 2px solid black;
                    background-color: #d8d8d8;
                  "
                >
                  Подпись
                </td>
              </tr>
              <tr style="border: 2px solid black; height: 35px">
                <td style="width: 33.3%; border: 2px solid black">
                  ${data.start.dateComlition.value}
                </td>
                <td style="width: 33.3%; border: 2px solid black">
                  ${data.personal.lastName.value} ${data.personal.name.value[0]}.
                  ${data.personal.surname.value[0]}.
                </td>
                <td style="width: 33.3%; border: 2px solid black"></td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </body>
  </html>
  <!-- 
      <div style="page-break-after: always; color: white">
          разрыв
      </div>
  -->
  `,
  };

  await getPdf(file, options, data, fileName);

  await sendMessages(fileName, data);
  console.log("5");

  // await new Promise(async (resolve, reject) => {
  //   await new Promise(async (res, rej) => {
  //     bd.forEach(async (chatId) => {
  //       await bot
  //         .sendDocument(chatId, `${fileName}pdf`)
  //         .catch((error) => reject());
  //       await bot
  //         .sendMessage(
  //           chatId,
  //           `${data.personal.name.value} ${data.personal.surname.value} ${data.personal.lastName.value} отправил анкету!`
  //         )
  //         .catch((error) => reject());
  //     });
  //     resolve();
  //   });

  //   console.log("файл отправлен!");
  //   resolve();
  // });

  // fs.unlink(`${fileName}.pdf`, (err) => {
  //   console.log("файл удален");
  //   if (err) throw err; // не удалось удалить файл
  // });
}

app.post("/saveFile", (req, res) => sendFile(req, res));

ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));
