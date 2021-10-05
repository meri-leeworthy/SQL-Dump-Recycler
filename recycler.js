const fs = require("fs");
const path = require("path");
const readline = require("readline");
const inquirer = require("inquirer");
const { once } = require("events");

// REGEX

// In the dump that I have, data is located in SQL COPY queries.
// This regex matches a word that follows `COPY public.` at the beginning of a line.
// i.e. the name of a table in the public schema. Not sure if this is the same for non-postgres dumps
const COPY_PUBLIC_TABLE = /(?<=^COPY public\.)[a-z_]+/;
// Match all columns in the COPY query. (matches words that follow `(`, and words that follow `, `)
const TABLE_COLUMNS = /(?<=\()\w+|(?<=, )\w+/g;
// Match '\.' at the start of a line
const END_COPY = /^\\\./;

// USER PROMPTS

// ask user for path to file
const promptFilePath = async () =>
  inquirer
    .prompt([
      {
        type: "input",
        name: "filename",
        message: "Hello 🐝 could I please have the path to the SQL dumpfile?",
        default: "example/dump.sql",
      },
    ])
    .then((answers) => {
      return path.join(process.cwd(), answers.filename);
    });

// ask user to select table from list
const promptTable = async (tableNames) =>
  inquirer
    .prompt([
      {
        type: "list",
        name: "table",
        message:
          "Yay 🪲 Now it's time to select the table whose data you want to export.",
        choices: tableNames,
        pageSize: 15,
      },
    ])
    .then((answers) => answers.table);

// ask user to choose columns
const promptColumns = async (columns) =>
  inquirer
    .prompt([
      {
        type: "checkbox",
        name: "columns",
        message: "🕷 Ok. Now choose which column(s) you wish to export.",
        choices: columns,
        pageSize: 15,
      },
    ])
    .then((answers) => answers.columns);

// ask user what kind of separator they want in the exported file
const promptSeparator = async () =>
  inquirer
    .prompt([
      {
        type: "list",
        name: "separator",
        message:
          "🪳 You selected multiple columns. How do you want them separated in the output file?",
        choices: [
          { name: "Space, i.e. ` `", value: " " },
          { name: "Tab, i.e. `  ` or `\\t`", value: "\t" },
          { name: "Comma, i.e. `,`", value: "," },
          { name: "Comma and space, i.e. `, `", value: ", " },
          { name: "Newline, i.e. `\\n`", value: "\n" },
        ],
      },
    ])
    .then((answers) => answers.separator);

const promptFileExtension = async () =>
  inquirer
    .prompt([
      {
        type: "input",
        name: "extension",
        message: "🐞 Write the file extension!",
      },
    ])
    .then((answers) => answers.extension);

// PROCESS DATA

// little function for writing transient messages to console
const updateConsoleLine = (message) => {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(message);
};

// scan the dumpfile for database tables, return as array
// code adapted from https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
const getTables = async (filePath) => {
  const fileStream = fs.createReadStream(filePath, "utf8");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const line_counter = (
    (i = 0) =>
    () =>
      ++i
  )();

  let tables = [];

  rl.on("line", (line, lineNumber = line_counter()) => {
    const table = line.match(COPY_PUBLIC_TABLE);

    if (table) {
      table.push(lineNumber - 1);
      tables.push(table);
      updateConsoleLine(`🐛 Found ${tables.length} tables so far...`);
    }
  });

  await once(rl, "close");

  updateConsoleLine(
    `🦋 Finished searching file. Found ${tables.length} tables.\n`
  );

  return tables;
};

// get roles from file for the selected table
// optimised solution adapted from https://stackoverflow.com/questions/6394951/read-nth-line-of-file-in-nodejs
const getRows = (filePath, lineNumber) => {
  const fileStream = fs.createReadStream(filePath, "utf8");

  return new Promise((resolve, reject) => {
    let fileData = "";
    let query = [];
    fileStream.on("data", (chunk) => {
      fileData += chunk;

      let lines = fileData.split("\n");

      // if the stream has not yet reached the first line of data, set all previous array lines to empty
      if (lines.length <= +lineNumber)
        fileData = new Array(lines.length).join("\n");
      else {
        //loop until finds end of data or end of chunk
        while (lineNumber + query.length + 1 in lines) {
          if (lines[lineNumber + query.length + 1].match(END_COPY)) {
            fileStream.destroy();
            resolve(query);
            break;
          } else {
            query.push(lines[lineNumber + query.length + 1]);
          }
        }
      }
    });

    fileStream.on("error", (error) => {
      reject(error);
    });

    fileStream.on("end", () => {
      resolve("File end reached without finding line");
    });
  });
};

const exportFile = (fileName, row, fileExtension, separator) => {
  let contents = "";
  for (key in row) {
    contents += row[key];
    contents += separator;
  }
  const fullFileName = fileName + "." + fileExtension;
  fs.writeFile(fullFileName, contents, (error) => {
    if (error) throw error;
  });
};

const main = async () => {
  const filePath = await promptFilePath();
  const tables = await getTables(filePath);

  // remap as object structure as defined in the Inquirer docs: https://github.com/SBoudrias/Inquirer.js
  // 'name' is what gets shown as an option to the user. 'value' is what gets returned in the 'answers' object.
  const tableNames = tables.map((table, index) => {
    return { name: table[0], value: index };
  });

  const tableIndex = await promptTable(tableNames);
  const rows = await getRows(filePath, tables[tableIndex][1]);

  // scan for columns in the selected table
  const columns = tables[tableIndex].input.match(TABLE_COLUMNS);
  const columnNames = columns.map((column, index) => {
    return { name: column, value: index };
  });
  const selectedColumns = await promptColumns(columnNames);

  const mappedRows = rows.map((row) => {
    const splitRow = row.split("\t");
    const mappedRow = {};
    splitRow.forEach((column, index) => {
      selectedColumns.forEach((selectedColumn) => {
        if (index == selectedColumn) {
          mappedRow[columns[index]] = column;
        }
      });
    });
    return mappedRow;
  });

  let separator = "";
  if (selectedColumns.length > 1) {
    separator = await promptSeparator();
  }

  const fileExtension = await promptFileExtension();

  mappedRows.forEach((row, index) => {
    exportFile(index, row, fileExtension, separator);
  });

  console.log("🐞 Files successfully exported, great job 🐞");
};

main();
