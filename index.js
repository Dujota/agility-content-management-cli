const fs = require('fs');
const readline = require('readline');
require('dotenv').config();
const Papa = require('papaparse');
const agilityMgmt = require('@agility/content-management');

let contentArray;

// Create a new instance API client
const api = agilityMgmt.getApi({
  location: process.env.LOCATION,
  websiteName: process.env.WEBSITE_NAME,
  securityKey: process.env.API_KEY,
});

// Function to unpublish content in batches
const unpublishInBatches = async (contents) => {
  for (let i = 0; i < contents.length; i++) {
    if (i > 0 && i % 10 === 0) {
      console.log(`\n${i} out of ${contents.length} complete`);
    }
    await unpublish(contents[i]);
    process.stdout.write('*');
  }
  console.log(`\nAll content processed. Total: ${contents.length}`);
};

// Function to unpublish a single content item
const unpublish = async ({ contentID, languageCode }) => {
  try {
    const ID = await api.unpublishContent({
      contentID,
      languageCode,
    });
    console.log(`\nID VALUE: ${ID}`);
  } catch (error) {
    console.error(error);
  }
};

// Function to read the CSV and parse it
function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  Papa.parse(fileContent, {
    header: true,
    complete(results) {
      contentArray = results.data.map((item) => ({
        contentID: item.Agility_ContentID,
        languageCode: item.Agility_LanguageCode,
      }));

      console.log(contentArray);
      promptForUnpublish(); // Prompt user for unpublishing after parsing
    },
  });
}

// Function to list CSV files and prompt user to choose one
function chooseFile(csvFiles) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Choose a file to parse:');
  csvFiles.forEach((file, index) => {
    console.log(`${index}: ${file}`);
  });
  console.log('Enter the index of the file you want to parse, or "q" to quit:');

  rl.on('line', (input) => {
    if (input.toLowerCase() === 'q') {
      rl.close();
      return;
    }

    const index = parseInt(input, 10);
    if (!isNaN(index) && index >= 0 && index < csvFiles.length) {
      parseCSV(`csv/${csvFiles[index]}`);
      rl.close(); // Close this instance of readline after selection
    } else {
      console.log('Invalid index, please try again or enter "q" to quit:');
    }
  });
}

// Function to prompt user to decide on unpublishing
const promptForUnpublish = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Do you want to unpublish the exported content? (yes/q to quit) ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
      unpublishInBatches(contentArray);
      rl.close();
    } else if (answer.toLowerCase() === 'q') {
      console.log('Exiting...');
      rl.close();
    } else {
      console.log('Invalid option, please try again.');
      rl.prompt(); // Re-prompt the user without closing readline
    }
  });
};

// initialize the cli

// Read all files in 'csv' directory and start the process
fs.readdir('csv', (err, files) => {
  if (err) {
    console.error('Error reading the directory:', err);
    return;
  }

  const csvFiles = files.filter((file) => file.endsWith('.csv'));
  if (csvFiles.length === 0) {
    console.log('No CSV files found in the "csv" directory.');
    return;
  }

  chooseFile(csvFiles);
});
