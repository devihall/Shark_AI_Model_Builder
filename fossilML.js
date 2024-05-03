////////// logic for tabbed navigation


function openTab(tabName) {
  // Hide all tabs
  var tabs = document.getElementsByClassName("tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove("active");
  }

  // Deactivate all tab buttons
  var tabButtons = document.getElementsByClassName("tab-button");
  for (var i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove("active");
  }

  // Show the selected tab
  document.getElementById(tabName).classList.add("active");

  // Activate the selected tab button
  document
    .querySelector("[onclick*='" + tabName + "']")
    .classList.add("active");
}

////////////////////////////////////
//// logic for model training

// Initialize the MobileNet model
let myimages = [];
let img;
let currentIndex = 0;
let allImages = [];
let predictions = [];
// Initialize an array to store loss values
let lossData = [];
let trainingResults;
let loss;
let epoch;
let surface;
let inputText;

const myfeatureExtractor = ml5.featureExtractor("MobileNet", modelReady);
const myClassifier = myfeatureExtractor.classification();

console.log("myimages", myimages);

// Function to handle model loading
function modelReady() {
  console.log("Model is ready");
}

///////
function saveText() {
  // Get the value from the input field
  inputText = document.getElementById("textInput").value;

  // Do something with the inputText variable
  console.log("Input Text:", inputText);
  // You can assign this value to any other variable or perform further operations.
}
//////

// Function to handle training image files input
async function handleFileInput(inputId) {
  console.log("inputText", inputText);
  const input = document.getElementById(inputId);
  console.log("input", input);
  const promises = [];
  const thumbnailContainer = document.getElementById(
    "thumbnailContainer" + inputId[inputId.length - 1]
  );
  thumbnailContainer.innerHTML = ""; // Clear previous thumbnails

  // Retrieve the corresponding h4 element's text content using its id

  const h4TextContent = inputText;
  // const h4TextContent = document.getElementById(
  //   "category" + inputId[inputId.length - 1]
  // ).textContent;
  console.log("<<<h4TextContent>>>", h4TextContent);

  const numFiles = input.files.length;
  if (numFiles < 2) {
    // Show bootstrap alert
    const alertElement = document.createElement("div");
    // Show bootstrap alert
    alertElement.classList.add("alert", "alert-danger");
    alertElement.textContent = "Please select two or more files";

    // Append the alert to the trainingMessage div
    const trainingMessageDiv = document.getElementById("trainingMessage");
    trainingMessageDiv.appendChild(alertElement);

    // Remove the alert after a delay
    setTimeout(() => {
      alertElement.remove();
    }, 5000); // Remove after 5 seconds (adjust as needed)
    return; // Exit the function
  }

  // Continue with handling files if more than one file is selected
  for (let i = 0; i < input.files.length; i++) {
    console.log("input.files", input.files);

    const file = input.files[i];

    // Create a new image element
    const img = document.createElement("img");
    img.width = 100; // Set width for display purposes
    img.height = 100; // Set height for display purposes

    img.src = URL.createObjectURL(file);
    console.log("FILE", file);

    const thumbnailDiv = document.createElement("div");
    thumbnailDiv.classList.add("thumbnail");
    thumbnailDiv.appendChild(img);
    thumbnailContainer.appendChild(thumbnailDiv);

    // add uploaded images to myimages array
    myimages.push(img);

    // Use the h4TextContent as the category
    let category = h4TextContent.trim();
    console.log("category", category);

    console.log("IMG", img);

    promises.push(myClassifier.addImage(img, category));
    console.log(
      "myClassifier.addImage(img, category)",
      myClassifier.addImage(img, category)
    );
  }
  await Promise.all(promises);

  //////////////// logic for model training
  myClassifier
    .train(whileTraining)
    .then((results) => {
      const trainingMessageContainer =
        document.getElementById("trainingMessage");
      trainingMessageContainer.innerHTML = `
                <div class="alert alert-success" role="alert">
                    Training complete! Check the Performance tab for how the model did.
                </div> `;

      console.log("Training results:", results);
      const epoch = results.epoch;
      console.log("Training epoch 1:", epoch);
      const loss = results.history.loss;
      console.log("Training loss:", loss);

      //////////////// logic for model visualization
      const lossDataForVisualization = epoch.map((epochValue, index) => ({
        x: epochValue, // Epoch becomes x value
        y: loss[index], // Loss becomes y value
      }));

      // data structure for tfvis.render.linechart
      const data = {
        values: [lossDataForVisualization],
        series: ["Loss vs Epoch"],
      };

      // Get the container HTMLElement with id "demo"
      const container = document.getElementById("demo");

      // Additional options for labeling x and y axes
      const options = {
        xLabel: "Epoch", // Label for x-axis
        yLabel: "Loss", // Label for y-axis
      };

      // Render the line chart
      tfvis.render.linechart(container, data, options);
    })
    .catch((error) => {
      console.error("Error during training:", error);
    });
}

async function whileTraining() {
  console.log("model is training");

  // Display "Model is training" message
  const trainingMessageContainer = document.getElementById("trainingMessage");
  trainingMessageContainer.innerHTML = `
        <div class="alert alert-info" role="alert">
            Model is training...
        </div>`;
}

// logic for classifying images
///////////////////////////////////
function readURL(input) {
  console.log("choose image clicked");
  if (input.files && input.files[0]) {
    $("#classify").prop("disabled", false);
    var reader = new FileReader();

    reader.onload = function (e) {
      $("#image").attr("src", e.target.result);
    };

    reader.readAsDataURL(input.files[0]);
  }
}

/////////////////////////////////////////////////////
// logic for image classification with retrained model
function classify() {
  console.log("classify button clicked");
  $("#classify").prop("disabled", true);

  const element = $("#result");
  element.html("Detecting...").addClass("border");

  // Clear the content of the result div
  element.empty();

  // Initialize Image Classifier with MobileNet.
  const img = document.getElementById("image");
  myClassifier.classify(img, gotResult);

  // Move the #result div below the "Choose Image" and "Classify" button
  const resultContainer = $(".buttonList");
  const existingElement = $(".result-container");
  if (existingElement.length === 0) {
    resultContainer.after(
      '<div class="result-container p-2 mt-3" style="width: 300px;"></div>'
    );
  }
  resultContainer.parent().find(".result-container").html(element);

  // Function to run when results arrive
  function gotResult(error, results) {
    console.log("in gotResult function");
    if (error) {
      console.log(error);
      const errorMessage = $(
        "<div class='alert alert-danger alert-dismissible fade show' role='alert'>" +
          "Train the model before using the classifier" +
          "<button type='button' class='btn-close' data-bs-dismiss='alert' aria-label='Close'></button>" +
          "</div>"
      );
      $("#classifierMessage").append(errorMessage);
      element.html("classifier not ready!");
      setTimeout(() => {
        errorMessage.remove();
        element.remove();
      }, 3000); // Remove after 5 seconds (adjust as needed
    } else {
      console.log(results);

      let num = results[0].confidence * 100;
      element.html(
        "<h5> Shark AI classifier is " +
          num.toFixed(2) +
          "% sure your test image belongs to " +
          results[0].label +
          "</h5>"
      );
    }
  }
}
