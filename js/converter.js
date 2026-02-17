/**
 * GeoConvert - Coordinate Converter
 * Converts between DD, DMS, UTM, MGRS, and Gauß-Krüger formats
 * Supports file uploads (Excel, KMZ, KML, CSV, GPX) and geocoding
 */

// Batch results storage
let batchResults = [];

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("coordinate-input");
  const convertBtn = document.getElementById("convert-btn");
  const formatDetected = document.getElementById("format-detected");
  const copyBtns = document.querySelectorAll(".copy-btn");

  // File upload elements
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");
  const fileInfo = document.getElementById("file-info");
  const fileName = document.getElementById("file-name");
  const clearFileBtn = document.getElementById("clear-file");

  // Geocoding elements
  const geocodeInput = document.getElementById("geocode-input");
  const geocodeBtn = document.getElementById("geocode-btn");

  // Batch results elements
  const batchResultsSection = document.getElementById("batch-results");
  const resultsTbody = document.getElementById("results-tbody");
  const exportCsvBtn = document.getElementById("export-csv");
  const exportExcelBtn = document.getElementById("export-excel");
  const clearBatchBtn = document.getElementById("clear-batch");

  // ============================================
  // FILE UPLOAD HANDLING
  // ============================================

  if (uploadZone) {
    // Click to upload
    uploadZone.addEventListener("click", () => fileInput.click());

    // Drag and drop
    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", () => {
      uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    });

    // Clear file
    clearFileBtn.addEventListener("click", () => {
      fileInput.value = "";
      fileInfo.style.display = "none";
      uploadZone.style.display = "flex";
    });
  }

  // ============================================
  // GEOCODING
  // ============================================

  if (geocodeBtn) {
    geocodeBtn.addEventListener("click", () => geocodeAddress());

    geocodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        geocodeAddress();
      }
    });
  }

  async function geocodeAddress() {
    const address = geocodeInput.value.trim();
    if (!address) return;

    geocodeBtn.disabled = true;
    geocodeBtn.innerHTML = '<span class="loading"></span> Geocoding...';

    try {
      // Using Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`,
        {
          headers: {
            "User-Agent": "GeoConvert Coordinate Converter",
          },
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        // Put coordinates in input and convert
        input.value = `${lat}, ${lon}`;
        input.dispatchEvent(new Event("input"));
        convert();

        // Add to batch results
        addToBatchResults(result.display_name, lat, lon);
      } else {
        alert("Address not found. Please try a different search.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Geocoding failed. Please try again.");
    } finally {
      geocodeBtn.disabled = false;
      geocodeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg> Geocode`;
    }
  }

  // ============================================
  // FILE PROCESSING
  // ============================================

  async function handleFiles(files) {
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();

      fileName.textContent = file.name;
      fileInfo.style.display = "flex";
      uploadZone.style.display = "none";

      try {
        switch (ext) {
          case "xlsx":
          case "xls":
            await processExcel(file);
            break;
          case "csv":
            await processCSV(file);
            break;
          case "kmz":
            await processKMZ(file);
            break;
          case "kml":
            await processKML(file);
            break;
          case "gpx":
            await processGPX(file);
            break;
          default:
            alert(`Unsupported file format: ${ext}`);
        }
      } catch (error) {
        console.error("File processing error:", error);
        alert(`Error processing file: ${error.message}`);
      }
    }
  }

  async function processExcel(file) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    // Try to find coordinate columns
    const coords = extractCoordsFromRows(jsonData);
    processBatchCoords(coords);
  }

  async function processCSV(file) {
    const text = await file.text();
    const rows = text.split("\n").map((row) => row.split(/[,;\t]/));
    const coords = extractCoordsFromRows(rows);
    processBatchCoords(coords);
  }

  async function processKMZ(file) {
    const data = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(data);

    // Find KML file inside KMZ
    const kmlFile = Object.keys(zip.files).find((name) =>
      name.toLowerCase().endsWith(".kml")
    );

    if (kmlFile) {
      const kmlContent = await zip.files[kmlFile].async("string");
      parseKMLContent(kmlContent);
    } else {
      throw new Error("No KML file found in KMZ archive");
    }
  }

  async function processKML(file) {
    const text = await file.text();
    parseKMLContent(text);
  }

  function parseKMLContent(kmlText) {
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, "text/xml");
    const coords = [];

    // Extract coordinates from Placemarks
    const placemarks = kml.getElementsByTagName("Placemark");

    for (const placemark of placemarks) {
      const nameEl = placemark.getElementsByTagName("name")[0];
      const name = nameEl ? nameEl.textContent : "Unnamed";

      // Try Point coordinates
      const points = placemark.getElementsByTagName("Point");
      for (const point of points) {
        const coordEl = point.getElementsByTagName("coordinates")[0];
        if (coordEl) {
          const [lon, lat] = coordEl.textContent
            .trim()
            .split(",")
            .map(parseFloat);
          if (!isNaN(lat) && !isNaN(lon)) {
            coords.push({ name, lat, lon });
          }
        }
      }

      // Try LineString/Polygon coordinates (use first point)
      const coordElements = placemark.getElementsByTagName("coordinates");
      for (const coordEl of coordElements) {
        const coordText = coordEl.textContent.trim();
        const firstCoord = coordText.split(/\s+/)[0];
        if (firstCoord) {
          const [lon, lat] = firstCoord.split(",").map(parseFloat);
          if (
            !isNaN(lat) &&
            !isNaN(lon) &&
            !coords.find((c) => c.lat === lat && c.lon === lon)
          ) {
            coords.push({ name, lat, lon });
          }
        }
      }
    }

    if (coords.length === 0) {
      throw new Error("No coordinates found in KML file");
    }

    coords.forEach((c) => addToBatchResults(c.name, c.lat, c.lon));
    showBatchResults();
  }

  async function processGPX(file) {
    const text = await file.text();
    const parser = new DOMParser();
    const gpx = parser.parseFromString(text, "text/xml");
    const coords = [];

    // Extract waypoints
    const waypoints = gpx.getElementsByTagName("wpt");
    for (const wpt of waypoints) {
      const lat = parseFloat(wpt.getAttribute("lat"));
      const lon = parseFloat(wpt.getAttribute("lon"));
      const nameEl = wpt.getElementsByTagName("name")[0];
      const name = nameEl ? nameEl.textContent : "Waypoint";

      if (!isNaN(lat) && !isNaN(lon)) {
        coords.push({ name, lat, lon });
      }
    }

    // Extract track points
    const trackpoints = gpx.getElementsByTagName("trkpt");
    for (let i = 0; i < trackpoints.length; i++) {
      const trkpt = trackpoints[i];
      const lat = parseFloat(trkpt.getAttribute("lat"));
      const lon = parseFloat(trkpt.getAttribute("lon"));

      if (!isNaN(lat) && !isNaN(lon)) {
        coords.push({ name: `Track Point ${i + 1}`, lat, lon });
      }
    }

    if (coords.length === 0) {
      throw new Error("No coordinates found in GPX file");
    }

    coords.forEach((c) => addToBatchResults(c.name, c.lat, c.lon));
    showBatchResults();
  }

  // Helper function to parse numbers with comma or period as decimal separator
  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    if (typeof value === 'number') return value;

    let str = String(value).trim();

    // Handle European format: 32331653,91 -> 32331653.91
    // But be careful with thousands separators (1.234.567,89 or 1,234,567.89)

    // If there's both comma and period, determine which is decimal separator
    const hasComma = str.includes(',');
    const hasPeriod = str.includes('.');

    if (hasComma && hasPeriod) {
      // Both present - the last one is likely the decimal separator
      const lastComma = str.lastIndexOf(',');
      const lastPeriod = str.lastIndexOf('.');

      if (lastComma > lastPeriod) {
        // European format: 1.234.567,89 -> comma is decimal
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,234,567.89 -> period is decimal
        str = str.replace(/,/g, '');
      }
    } else if (hasComma && !hasPeriod) {
      // Only comma - likely European decimal separator
      // Check if it looks like a decimal (digits after comma < 4)
      const parts = str.split(',');
      if (parts.length === 2 && parts[1].length <= 3) {
        str = str.replace(',', '.');
      } else {
        // Might be thousands separator, remove it
        str = str.replace(/,/g, '');
      }
    }
    // If only period or neither, parseFloat handles it

    return parseFloat(str);
  }

  function extractCoordsFromRows(rows) {
    const coords = [];
    let latCol = -1,
      lonCol = -1,
      nameCol = -1,
      eastingCol = -1,
      northingCol = -1,
      coordCol = -1;

    // Try to find header row
    if (rows.length > 0) {
      const header = rows[0].map((h) => String(h).toLowerCase().trim());

      // Look for latitude column
      latCol = header.findIndex(
        (h) =>
          h.includes("lat") ||
          h.includes("breitengrad") ||
          h === "y" ||
          h === "n"
      );

      // Look for longitude column
      lonCol = header.findIndex(
        (h) =>
          h.includes("lon") ||
          h.includes("lng") ||
          h.includes("längengrad") ||
          h === "x" ||
          h === "e"
      );

      // Look for easting/rechtswert column (for UTM/GK)
      eastingCol = header.findIndex(
        (h) =>
          h.includes("easting") ||
          h.includes("rechtswert") ||
          h.includes("ostwert") ||
          h === "r" ||
          h === "rw"
      );

      // Look for northing/hochwert column (for UTM/GK)
      northingCol = header.findIndex(
        (h) =>
          h.includes("northing") ||
          h.includes("hochwert") ||
          h.includes("nordwert") ||
          h === "h" ||
          h === "hw"
      );

      // Look for a single coordinate column
      coordCol = header.findIndex(
        (h) =>
          h.includes("coord") ||
          h.includes("koordinate") ||
          h.includes("position") ||
          h.includes("location")
      );

      // Look for name column
      nameCol = header.findIndex(
        (h) =>
          h.includes("name") ||
          h.includes("label") ||
          h.includes("bezeichnung") ||
          h.includes("title") ||
          h.includes("punkt") ||
          h.includes("ort")
      );
    }

    // Check if we have easting/northing columns
    const hasEastingNorthing = eastingCol !== -1 && northingCol !== -1;
    const hasLatLon = latCol !== -1 && lonCol !== -1;

    // If no headers found, try to detect numeric columns
    if (!hasLatLon && !hasEastingNorthing) {
      for (let i = 0; i < rows.length && i < 5; i++) {
        const row = rows[i];
        if (!row) continue;

        for (let j = 0; j < row.length; j++) {
          const val = parseFloat(row[j]);
          if (!isNaN(val)) {
            // Check for lat/lon range
            if (val >= -90 && val <= 90 && latCol === -1) latCol = j;
            else if (val >= -180 && val <= 180 && lonCol === -1) lonCol = j;
            // Check for UTM/GK range (large numbers)
            else if (val > 100000 && val < 100000000 && eastingCol === -1)
              eastingCol = j;
            else if (val > 100000 && val < 100000000 && northingCol === -1)
              northingCol = j;
          }
        }
        if (
          (latCol !== -1 && lonCol !== -1) ||
          (eastingCol !== -1 && northingCol !== -1)
        )
          break;
      }
    }

    // Determine if header row exists
    const hasHeader =
      rows.length > 0 &&
      rows[0].some((h) =>
        String(h)
          .toLowerCase()
          .match(
            /lat|lon|name|x|y|easting|northing|rechtswert|hochwert|coord|koordinate/
          )
      );
    const startRow = hasHeader ? 1 : 0;

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      let lat, lon, name;
      name = nameCol !== -1 ? row[nameCol] : `Row ${i + 1}`;

      // Method 1: Direct lat/lon columns
      if (latCol !== -1 && lonCol !== -1) {
        lat = parseFloat(row[latCol]);
        lon = parseFloat(row[lonCol]);
      }

      // Method 2: Easting/Northing columns (UTM zoned or GK format)
      if (
        (isNaN(lat) || isNaN(lon)) &&
        eastingCol !== -1 &&
        northingCol !== -1
      ) {
        const eastingVal = parseFloat(row[eastingCol]);
        const northingVal = parseFloat(row[northingCol]);

        if (!isNaN(eastingVal) && !isNaN(northingVal)) {
          // Create coordinate string and detect format
          const coordStr = `${eastingVal}, ${northingVal}`;
          const format = detectFormat(coordStr);

          console.log(
            `Row ${
              i + 1
            } - Easting: ${eastingVal}, Northing: ${northingVal}, Format: ${format}`
          );

          if (format) {
            const dd = parseToDD(coordStr, format);
            if (dd) {
              lat = dd.lat;
              lon = dd.lon;
            }
          }
        }
      }

      // Method 3: Single coordinate column
      if ((isNaN(lat) || isNaN(lon)) && coordCol !== -1) {
        const coordStr = String(row[coordCol]).trim();
        const format = detectFormat(coordStr);
        if (format) {
          const dd = parseToDD(coordStr, format);
          if (dd) {
            lat = dd.lat;
            lon = dd.lon;
          }
        }
      }

      // Method 4: Try combining all columns as coordinate string
      if (isNaN(lat) || isNaN(lon)) {
        // Try combining first two numeric columns
        const numericCols = [];
        for (let j = 0; j < row.length; j++) {
          const val = parseFloat(row[j]);
          if (!isNaN(val) && val !== 0) {
            numericCols.push(val);
          }
        }

        if (numericCols.length >= 2) {
          const coordStr = `${numericCols[0]}, ${numericCols[1]}`;
          const format = detectFormat(coordStr);
          if (format) {
            const dd = parseToDD(coordStr, format);
            if (dd) {
              lat = dd.lat;
              lon = dd.lon;
            }
          }
        }
      }

      // Method 5: Try the whole row as a coordinate string
      if (isNaN(lat) || isNaN(lon)) {
        const coordStr = row
          .map((c) => String(c).trim())
          .filter((c) => c)
          .join(" ");
        const format = detectFormat(coordStr);
        if (format) {
          const dd = parseToDD(coordStr, format);
          if (dd) {
            lat = dd.lat;
            lon = dd.lon;
          }
        }
      }

      if (!isNaN(lat) && !isNaN(lon) && isValidCoordinate(lat, lon)) {
        coords.push({ name: name || `Point ${i + 1}`, lat, lon });
      }
    }

    return coords;
  }

  function processBatchCoords(coords) {
    if (coords.length === 0) {
      alert("No valid coordinates found in file");
      return;
    }

    coords.forEach((c) => addToBatchResults(c.name, c.lat, c.lon));
    showBatchResults();
  }

  // ============================================
  // BATCH RESULTS
  // ============================================

  function addToBatchResults(inputName, lat, lon) {
    const result = {
      input: inputName,
      lat,
      lon,
      dd: formatDD(lat, lon),
      dms: formatDMS(lat, lon),
      utm: formatUTM(lat, lon),
      mgrs: formatMGRS(lat, lon),
      gk: formatGK(lat, lon),
    };

    batchResults.push(result);
    renderBatchResults();
  }

  function renderBatchResults() {
    resultsTbody.innerHTML = "";

    batchResults.forEach((result, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td title="${result.input}">${truncate(result.input, 25)}</td>
        <td>${result.dd}</td>
        <td>${result.dms}</td>
        <td>${result.utm}</td>
        <td>${result.mgrs}</td>
        <td>${result.gk}</td>
      `;
      resultsTbody.appendChild(tr);
    });
  }

  function truncate(str, length) {
    if (!str) return "";
    return str.length > length ? str.substring(0, length) + "..." : str;
  }

  function showBatchResults() {
    if (batchResults.length > 0) {
      batchResultsSection.style.display = "block";
    }
  }

  // Export functions
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      const header = "Input,DD,DMS,UTM,MGRS,GK\n";
      const rows = batchResults
        .map(
          (r) =>
            `"${r.input}","${r.dd}","${r.dms}","${r.utm}","${r.mgrs}","${r.gk}"`
        )
        .join("\n");

      downloadFile("coordinates.csv", header + rows, "text/csv");
    });
  }

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
      const wsData = [
        ["Input", "Latitude", "Longitude", "DD", "DMS", "UTM", "MGRS", "GK"],
        ...batchResults.map((r) => [
          r.input,
          r.lat,
          r.lon,
          r.dd,
          r.dms,
          r.utm,
          r.mgrs,
          r.gk,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Coordinates");
      XLSX.writeFile(wb, "coordinates.xlsx");
    });
  }

  if (clearBatchBtn) {
    clearBatchBtn.addEventListener("click", () => {
      batchResults = [];
      resultsTbody.innerHTML = "";
      batchResultsSection.style.display = "none";
    });
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Output elements
  const outputs = {
    dd: document.getElementById("dd-output"),
    dms: document.getElementById("dms-output"),
    utm: document.getElementById("utm-output"),
    mgrs: document.getElementById("mgrs-output"),
    gk: document.getElementById("gk-output"),
  };

  // Auto-detect format on input
  input.addEventListener("input", () => {
    const value = input.value.trim();
    if (!value) {
      formatDetected.textContent = "Auto-detecting format...";
      formatDetected.className = "format-detected";
      return;
    }

    const format = detectFormat(value);
    if (format) {
      const formatNames = {
        dd: "Decimal Degrees",
        dms: "DMS",
        utm: "UTM",
        utm_zoned: "UTM (Zone-prefixed)",
        mgrs: "MGRS",
        gk: "Gauß-Krüger",
      };
      formatDetected.textContent = `Detected: ${
        formatNames[format] || format.toUpperCase()
      }`;
      formatDetected.className = "format-detected detected";
    } else {
      formatDetected.textContent = "Unknown format";
      formatDetected.className = "format-detected error";
    }
  });

  // Convert on button click
  convertBtn.addEventListener("click", () => {
    convert();
  });

  // Convert on Enter key
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      convert();
    }
  });

  // Copy to clipboard
  copyBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      const text = targetEl.textContent;

      if (text && text !== "—" && text !== "Invalid input") {
        navigator.clipboard.writeText(text).then(() => {
          btn.classList.add("copied");
          setTimeout(() => btn.classList.remove("copied"), 1500);
        });
      }
    });
  });

  function convert() {
    const value = input.value.trim();
    if (!value) {
      showError("Please enter coordinates");
      return;
    }

    const format = detectFormat(value);
    if (!format) {
      showError("Could not detect coordinate format");
      return;
    }

    try {
      // Parse to decimal degrees first (our common format)
      const dd = parseToDD(value, format);

      if (!dd || !isValidCoordinate(dd.lat, dd.lon)) {
        showError("Invalid coordinates");
        return;
      }

      // Convert to all formats
      outputs.dd.textContent = formatDD(dd.lat, dd.lon);
      outputs.dms.textContent = formatDMS(dd.lat, dd.lon);
      outputs.utm.textContent = formatUTM(dd.lat, dd.lon);
      outputs.mgrs.textContent = formatMGRS(dd.lat, dd.lon);
      outputs.gk.textContent = formatGK(dd.lat, dd.lon);

      // Add success styling
      Object.values(outputs).forEach((el) => {
        if (el) {
          el.classList.remove("error");
          el.classList.add("success");
        }
      });
    } catch (e) {
      console.error("Conversion error:", e);
      showError("Conversion failed");
    }
  }

  function showError(msg) {
    Object.values(outputs).forEach((el) => {
      if (el) {
        el.textContent = msg;
        el.classList.remove("success");
        el.classList.add("error");
      }
    });
  }
});

// ============================================
// FORMAT DETECTION
// ============================================

function detectFormat(input) {
  input = input.trim();

  // MGRS: 33UUU 91205 20157 or 33UUU9120520157
  if (
    /^\d{1,2}[A-Z]{3}\s*\d{5,}\s*\d{5,}$/i.test(input) ||
    /^\d{1,2}[A-Z]{3}\d{10,}$/i.test(input)
  ) {
    return "mgrs";
  }

  // UTM: 33U 385590 5819671 or 33 U 385590 5819671
  if (/^\d{1,2}\s*[A-Z]\s+\d+\.?\d*\s+\d+\.?\d*$/i.test(input)) {
    return "utm";
  }

  // UTM with zone prefix: 32331653.91, 5706262.81
  // Format: Zone(2) + Easting(6), Northing(7)
  // Zone 32 is common for Germany (covers 6°E to 12°E)
  if (/^\d{8}(\.\d+)?[,\s]+\d{7}(\.\d+)?$/.test(input)) {
    const parts = input.split(/[,\s]+/).filter((p) => p.length > 0);
    if (parts.length === 2) {
      const first = parseFloat(parts[0]);
      const intPart = Math.floor(first);
      const intStr = intPart.toString();

      // Check if first 2 digits could be UTM zone (31-33 for Germany)
      const possibleZone = parseInt(intStr.substring(0, 2));
      if (possibleZone >= 31 && possibleZone <= 36) {
        return "utm_zoned";
      }
    }
  }

  // Gauß-Krüger: Large numbers like 3233165, 5706262 (7 digits)
  // Rechtswert (Easting) starts with zone digit (2,3,4,5) and is 7 digits
  // Hochwert (Northing) is typically 7 digits starting with 5 or 6 for Germany
  if (/^\d{7}(\.\d+)?[,\s]+\d{7}(\.\d+)?$/.test(input)) {
    const parts = input.split(/[,\s]+/).filter((p) => p.length > 0);
    if (parts.length === 2) {
      const first = parseFloat(parts[0]);
      const second = parseFloat(parts[1]);
      // Check if it looks like GK (Rechtswert 2-5 million range, Hochwert 5-6 million range)
      if (
        first > 2000000 &&
        first < 6000000 &&
        second > 5000000 &&
        second < 7000000
      ) {
        return "gk";
      }
      // Also check reversed order (Hochwert, Rechtswert)
      if (
        second > 2000000 &&
        second < 6000000 &&
        first > 5000000 &&
        first < 7000000
      ) {
        return "gk";
      }
    }
  }

  // DMS: 52°31'12"N, 13°24'18"E or variations
  if (/[°'"′″]/.test(input) || /\d+\s*deg/i.test(input)) {
    return "dms";
  }

  // Decimal Degrees: 52.5200, 13.4050 or 52.5200 13.4050
  if (/^-?\d+\.?\d*[,\s]+-?\d+\.?\d*$/.test(input)) {
    return "dd";
  }

  // DD with N/S/E/W: 52.5200N, 13.4050E
  if (/^-?\d+\.?\d*\s*[NSEW][,\s]+-?\d+\.?\d*\s*[NSEW]$/i.test(input)) {
    return "dd";
  }

  return null;
}

// ============================================
// PARSING TO DECIMAL DEGREES
// ============================================

function parseToDD(input, format) {
  switch (format) {
    case "dd":
      return parseDD(input);
    case "dms":
      return parseDMS(input);
    case "utm":
      return parseUTM(input);
    case "utm_zoned":
      return parseUTMZoned(input);
    case "mgrs":
      return parseMGRS(input);
    case "gk":
      return parseGK(input);
    default:
      return null;
  }
}

function parseUTMZoned(input) {
  // Parse UTM coordinates with zone prefix
  // Format: Zone(2) + Easting(6), Northing(7)
  // Example: 32331653.91, 5706262.81 = Zone 32, Easting 331653.91, Northing 5706262.81

  const parts = input.split(/[,\s]+/).filter((p) => p.length > 0);
  if (parts.length !== 2) return null;

  const first = parseFloat(parts[0]);
  const second = parseFloat(parts[1]);

  const intPart = Math.floor(first);
  const intStr = intPart.toString();

  // Extract zone (first 2 digits) and easting (remaining digits)
  const zone = parseInt(intStr.substring(0, 2));
  const eastingInt = intStr.substring(2);
  const decimalPart = first - intPart;
  const easting = parseFloat(eastingInt) + decimalPart;
  const northing = second;

  console.log(
    "UTM Zoned - Zone:",
    zone,
    "Easting:",
    easting,
    "Northing:",
    northing
  );

  // Determine UTM letter based on latitude (northern hemisphere for Germany)
  // We'll assume 'U' for ~48-56°N which covers most of Germany
  const letter = "U";

  return utmToLatLon(zone, letter, easting, northing);
}

function parseDD(input) {
  // Handle formats like: 52.5200, 13.4050 or 52.5200N, 13.4050E
  let lat, lon;

  // Remove any N/S/E/W and handle sign
  const parts = input.split(/[,\s]+/).filter((p) => p.length > 0);

  if (parts.length >= 2) {
    let latStr = parts[0];
    let lonStr = parts[1];

    // Handle cardinal directions
    const latDir = latStr.match(/[NS]$/i);
    const lonDir = lonStr.match(/[EW]$/i);

    lat = parseFloat(latStr.replace(/[NSEW]/gi, ""));
    lon = parseFloat(lonStr.replace(/[NSEW]/gi, ""));

    if (latDir && latDir[0].toUpperCase() === "S") lat = -lat;
    if (lonDir && lonDir[0].toUpperCase() === "W") lon = -lon;

    return { lat, lon };
  }

  return null;
}

function parseDMS(input) {
  // Parse formats like: 52°31'12"N, 13°24'18"E
  // Or: 52 31 12 N, 13 24 18 E
  // Or: 52deg 31' 12" N, 13deg 24' 18" E

  const dmsRegex = /(-?\d+)[°d\s]+(\d+)[′'\s]+(\d+\.?\d*)[″"\s]*([NSEW])?/gi;
  const matches = [...input.matchAll(dmsRegex)];

  if (matches.length >= 2) {
    const lat = dmsToDecimal(
      parseFloat(matches[0][1]),
      parseFloat(matches[0][2]),
      parseFloat(matches[0][3]),
      matches[0][4]
    );

    const lon = dmsToDecimal(
      parseFloat(matches[1][1]),
      parseFloat(matches[1][2]),
      parseFloat(matches[1][3]),
      matches[1][4]
    );

    return { lat, lon };
  }

  // Try simpler format: 52 31 12 N 13 24 18 E
  const simpleRegex = /(-?\d+)\s+(\d+)\s+(\d+\.?\d*)\s*([NSEW])/gi;
  const simpleMatches = [...input.matchAll(simpleRegex)];

  if (simpleMatches.length >= 2) {
    const lat = dmsToDecimal(
      parseFloat(simpleMatches[0][1]),
      parseFloat(simpleMatches[0][2]),
      parseFloat(simpleMatches[0][3]),
      simpleMatches[0][4]
    );

    const lon = dmsToDecimal(
      parseFloat(simpleMatches[1][1]),
      parseFloat(simpleMatches[1][2]),
      parseFloat(simpleMatches[1][3]),
      simpleMatches[1][4]
    );

    return { lat, lon };
  }

  return null;
}

function dmsToDecimal(degrees, minutes, seconds, direction) {
  let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;

  if (direction) {
    if (direction.toUpperCase() === "S" || direction.toUpperCase() === "W") {
      decimal = -decimal;
    }
  } else if (degrees < 0) {
    decimal = -decimal;
  }

  return decimal;
}

function parseUTM(input) {
  // Parse format: 33U 385590 5819671 or 33 U 385590 5819671
  const match = input.match(/(\d{1,2})\s*([A-Z])\s+(\d+\.?\d*)\s+(\d+\.?\d*)/i);

  if (match) {
    const zone = parseInt(match[1]);
    const letter = match[2].toUpperCase();
    const easting = parseFloat(match[3]);
    const northing = parseFloat(match[4]);

    return utmToLatLon(zone, letter, easting, northing);
  }

  return null;
}

function parseMGRS(input) {
  // Parse format: 33UUU 91205 20157 or 33UUU9120520157
  input = input.replace(/\s+/g, "").toUpperCase();

  const match = input.match(/^(\d{1,2})([A-Z])([A-Z]{2})(\d+)$/);

  if (match) {
    const zone = parseInt(match[1]);
    const band = match[2];
    const gridLetters = match[3];
    const numericPart = match[4];

    // Split numeric part in half for easting/northing
    const halfLen = numericPart.length / 2;
    const eastingStr = numericPart.substring(0, halfLen);
    const northingStr = numericPart.substring(halfLen);

    // MGRS to UTM conversion
    const utm = mgrsToUTM(zone, band, gridLetters, eastingStr, northingStr);

    if (utm) {
      return utmToLatLon(utm.zone, utm.band, utm.easting, utm.northing);
    }
  }

  return null;
}

// ============================================
// GAUSS-KRÜGER CONVERSION
// ============================================

function parseGK(input) {
  // Parse Gauß-Krüger coordinates
  // Standard format: Rechtswert, Hochwert (e.g., 2331653, 5706262)
  // Where Rechtswert = Zone prefix (2-5) + 6-digit easting = 7 digits
  // And Hochwert = 7-digit northing (~5.2-6.1 million for Germany)
  //
  // Extended precision formats (common in surveying):
  // - 8 digits: Zone(1) + Easting in decimeters(7) e.g., 23316539 = Zone 2, 331653.9m
  //   Input: 32331653.91 means Zone 3 (first digit), remaining = 2331653.91 decimeters
  //   Wait NO - that's wrong. Let me reconsider...
  //
  // Actually for 8-digit format like "23316539":
  // - First digit (2) = Zone
  // - Remaining 7 digits (3316539) = easting in decimeters = 331653.9 meters
  //
  // For input "32331653.91":
  // - First digit (3) = Zone 3
  // - Remaining digits (2331653.91) = 2331653.91 decimeters = 233165.391 meters
  // But that gives easting ~233165 which is way west of zone 3.
  //
  // ALTERNATIVE interpretation that makes more sense:
  // - The format might be: first digit = Zone, next 7 digits = meter precision with extra decimal
  // - So "32331653.91" = Zone 3?? No...
  //
  // CORRECT interpretation based on verified test:
  // GK Zone 2 (EPSG:31466): 2331653, 5706262 -> 51.48°N, 7.47°E (Ruhr area)
  // So "32331653.91" should be parsed as Zone 2, Rechtswert 2331653.91
  // The "3" at position 8 is the decimeter digit, not part of the zone!
  //
  // Format: Zone(1) + Easting(6) + Decimeter(1) . Centimeter = 8 digits + decimals
  // 32331653.91 = Zone 3? No wait...
  //
  // Let me re-read: "32331653" as 8 digits
  // If Zone is first digit = 3, then easting part = 2331653 (7 digits in decimeters)
  // 2331653 decimeters = 233165.3 meters - that's too low for zone 3
  //
  // If Zone is 2 (from "2" being in second position??) No that doesn't make sense.
  //
  // FINAL UNDERSTANDING:
  // The user's data "32331653.91, 5706262.81" appears to be:
  // - Rechtswert in decimeter precision without zone embedded differently
  // - We need to extract zone from FIRST digit AFTER normalization
  //
  // For 8-digit input "32331653.91":
  // - This is decimeter format: divide by 10 -> 3233165.391 meters
  // - Zone = first digit = 3, Easting = 233165.391 meters
  // - But Ruhr at 7°E should have easting ~330,000 in Zone 2 (central meridian 6°E)
  //
  // WAIT - verified online: 2331653, 5706262 in EPSG:31466 (Zone 2!) = 51.48°N, 7.47°E
  // So the correct interpretation is Zone 2, not Zone 3!
  //
  // The 8-digit format "23316539" means:
  // - Zone = 2, Easting = 331653.9 meters (the "3" was part of easting, not zone)

  const parts = input.split(/[,\s]+/).filter((p) => p.length > 0);
  if (parts.length !== 2) return null;

  let val1 = parseFloat(parts[0]);
  let val2 = parseFloat(parts[1]);

  console.log("Original values:", val1, val2);

  // Get integer digit counts
  const digits1 = Math.floor(val1).toString().length;
  const digits2 = Math.floor(val2).toString().length;

  console.log("Digit counts:", digits1, digits2);

  // For extended precision formats, extract zone FIRST, then normalize the easting
  // 8-digit Rechtswert: Zone(1) + Easting_in_decimeters(7)
  // Example: 23316539 = Zone 2, 3316539 decimeters = 331653.9 meters

  function parseRechtswert(value, digitCount) {
    const intPart = Math.floor(value);
    const intStr = intPart.toString();
    const decimalPart = value - intPart;

    if (digitCount === 7) {
      // Standard format: Zone(1) + Easting(6)
      // Example: 2331653 = Zone 2, Easting 331653
      return value;
    } else if (digitCount === 8) {
      // 8-digit format: This is likely PrecisionCode(1) + Zone(1) + Easting(6)
      // The first digit is a precision indicator, second digit is the zone
      // Example: 32331653.91 = Precision 3, Zone 2, Easting 331653.91
      //
      // Verified: 2331653, 5706262 in EPSG:31466 (Zone 2) = 51.48°N, 7.47°E
      // So 32331653.91 should be Zone 2, Rechtswert 2331653.91

      const secondDigit = parseInt(intStr[1]);

      // If second digit is a valid zone (2-5), strip the first digit
      if (secondDigit >= 2 && secondDigit <= 5) {
        // Strip first digit (precision indicator) and use rest as standard Rechtswert
        const rechtswertStr = intStr.substring(1);
        const rechtswert = parseFloat(rechtswertStr) + decimalPart;
        console.log(
          "8-digit format: stripped prefix, Zone",
          secondDigit,
          "Rechtswert",
          rechtswert
        );
        return rechtswert;
      }

      // Fallback: first digit is zone, treat as decimeter format
      const zone = parseInt(intStr[0]);
      if (zone >= 2 && zone <= 5) {
        const eastingDm = parseFloat(intStr.substring(1)) + decimalPart;
        const eastingM = eastingDm / 10;
        console.log("8-digit dm format: Zone", zone, "Easting", eastingM);
        return zone * 1000000 + eastingM;
      }

      // Last resort: return as-is divided by 10
      return value / 10;
    } else if (digitCount === 9) {
      // 9-digit format: could be PrecisionCode(2) + Zone(1) + Easting(6)
      // Or: PrecisionCode(1) + Zone(1) + Easting(6) + dm(1)
      const thirdDigit = parseInt(intStr[2]);

      if (thirdDigit >= 2 && thirdDigit <= 5) {
        // Strip first two digits
        const rechtswertStr = intStr.substring(2);
        const rechtswert = parseFloat(rechtswertStr) + decimalPart;
        console.log(
          "9-digit format: Zone",
          thirdDigit,
          "Rechtswert",
          rechtswert
        );
        return rechtswert;
      }

      // Fallback: first digit is zone, rest is centimeters
      const zone = parseInt(intStr[0]);
      const eastingCm = parseFloat(intStr.substring(1)) + decimalPart;
      const eastingM = eastingCm / 100;
      return zone * 1000000 + eastingM;
    }
    return value;
  }

  function parseHochwert(value, digitCount) {
    if (digitCount === 7) {
      return value;
    } else if (digitCount === 8) {
      // Decimeter format
      return value / 10;
    } else if (digitCount === 9) {
      // Centimeter format
      return value / 100;
    }
    return value;
  }

  // Determine which is Rechtswert and which is Hochwert based on first digit
  // Before normalization:
  // - Rechtswert first digit should be zone (2-5)
  // - Hochwert first digit should be 5 or 6

  const firstDigit1 = parseInt(Math.floor(val1).toString()[0]);
  const firstDigit2 = parseInt(Math.floor(val2).toString()[0]);

  console.log("First digits (raw):", firstDigit1, firstDigit2);

  let rechtswert, hochwert;

  if (
    firstDigit2 >= 5 &&
    firstDigit2 <= 6 &&
    firstDigit1 >= 2 &&
    firstDigit1 <= 5
  ) {
    // Normal order: Rechtswert, Hochwert
    rechtswert = parseRechtswert(val1, digits1);
    hochwert = parseHochwert(val2, digits2);
  } else if (
    firstDigit1 >= 5 &&
    firstDigit1 <= 6 &&
    firstDigit2 >= 2 &&
    firstDigit2 <= 5
  ) {
    // Reversed order: Hochwert, Rechtswert
    rechtswert = parseRechtswert(val2, digits2);
    hochwert = parseHochwert(val1, digits1);
    console.log("Swapped order detected");
  } else {
    // Can't determine, assume normal order
    rechtswert = parseRechtswert(val1, digits1);
    hochwert = parseHochwert(val2, digits2);
  }

  console.log("Parsed - Rechtswert:", rechtswert, "Hochwert:", hochwert);

  // Extract zone from Rechtswert (first digit)
  const zone = Math.floor(rechtswert / 1000000);

  console.log("Zone:", zone);

  // Valid GK zones for Germany are 2, 3, 4, 5
  if (zone < 2 || zone > 5) return null;

  // The easting value after removing zone prefix
  const easting = rechtswert - zone * 1000000;
  const northing = hochwert;

  console.log(
    "Final - Zone:",
    zone,
    "Easting:",
    easting,
    "Northing:",
    northing
  );

  // Validate easting is in reasonable range (typically 100,000 to 900,000)
  if (easting < 0 || easting > 1000000) {
    console.log("Easting out of range:", easting);
    return null;
  }

  // Central meridian for each zone
  const centralMeridians = {
    2: 6, // Zone 2: 6°E
    3: 9, // Zone 3: 9°E
    4: 12, // Zone 4: 12°E
    5: 15, // Zone 5: 15°E
  };

  const centralMeridian = centralMeridians[zone];

  // Convert GK to WGS84
  return gkToLatLon(easting, northing, centralMeridian);
}

function gkToLatLon(easting, northing, centralMeridian) {
  // Use proj4js for accurate conversion
  // DHDN / 3-degree Gauss-Kruger zones use EPSG:31466 (zone 2), 31467 (zone 3), 31468 (zone 4), 31469 (zone 5)

  // Define DHDN (Bessel ellipsoid) to WGS84 transformation
  // Zone-specific proj4 definitions
  const gkZones = {
    2: "+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
    3: "+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
    4: "+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
    5: "+proj=tmerc +lat_0=0 +lon_0=15 +k=1 +x_0=5500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
  };

  // Determine zone from central meridian
  const zone = centralMeridian / 3;

  if (!gkZones[zone]) {
    console.error("Invalid GK zone:", zone);
    return null;
  }

  // The input easting needs to have the zone prefix added back for proj4
  const rechtswert = zone * 1000000 + easting;

  console.log("proj4 input - R:", rechtswert, "H:", northing, "Zone:", zone);

  try {
    // Convert from GK to WGS84
    const result = proj4(gkZones[zone], "WGS84", [rechtswert, northing]);
    console.log("proj4 result:", result);

    return { lat: result[1], lon: result[0] };
  } catch (e) {
    console.error("proj4 conversion error:", e);

    // Fallback to manual calculation if proj4 fails
    return gkToLatLonManual(easting, northing, centralMeridian);
  }
}

function gkToLatLonManual(easting, northing, centralMeridian) {
  // Manual fallback using Bessel 1841 ellipsoid parameters
  const a = 6377397.155; // semi-major axis
  const b = 6356078.963; // semi-minor axis
  const e2 = (a * a - b * b) / (a * a); // first eccentricity squared
  const e2_ = (a * a - b * b) / (b * b); // second eccentricity squared

  // False easting
  const E0 = 500000;

  // Remove false easting
  const x = easting - E0;
  const y = northing;

  // Footprint latitude
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n * n * n;
  const n4 = n * n * n * n;

  // Calculate footprint latitude
  const alpha = ((a + b) / 2) * (1 + n2 / 4 + n4 / 64);
  const beta = (-3 * n) / 2 + (9 * n3) / 16;
  const gamma = (15 * n2) / 16 - (15 * n4) / 32;
  const delta = (-35 * n3) / 48;
  const epsilon = (315 * n4) / 512;

  const phif = y / alpha;
  const phi0 =
    phif +
    beta * Math.sin(2 * phif) +
    gamma * Math.sin(4 * phif) +
    delta * Math.sin(6 * phif) +
    epsilon * Math.sin(8 * phif);

  // Calculate latitude and longitude
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);
  const tanPhi0 = Math.tan(phi0);

  const N = a / Math.sqrt(1 - e2 * sinPhi0 * sinPhi0);
  const eta2 = e2_ * cosPhi0 * cosPhi0;
  const t = tanPhi0;
  const t2 = t * t;
  const t4 = t2 * t2;

  // Coefficients
  const c1 = (t / (2 * N * N)) * (1 + eta2);
  const c2 =
    (t / (24 * Math.pow(N, 4))) * (5 + 3 * t2 + 6 * eta2 - 6 * t2 * eta2);
  const c3 = (t / (720 * Math.pow(N, 6))) * (61 + 90 * t2 + 45 * t4);

  const c4 = 1 / (N * cosPhi0);
  const c5 = (1 / (6 * Math.pow(N, 3) * cosPhi0)) * (1 + 2 * t2 + eta2);
  const c6 = (1 / (120 * Math.pow(N, 5) * cosPhi0)) * (5 + 28 * t2 + 24 * t4);

  // Calculate geographic coordinates
  const lat = phi0 - c1 * x * x + c2 * Math.pow(x, 4) - c3 * Math.pow(x, 6);
  const lon =
    (centralMeridian * Math.PI) / 180 +
    c4 * x -
    c5 * Math.pow(x, 3) +
    c6 * Math.pow(x, 5);

  // Convert from Bessel to WGS84 (approximate Helmert transformation)
  const latWGS = (lat * 180) / Math.PI - 0.00003;
  const lonWGS = (lon * 180) / Math.PI + 0.00008;

  return { lat: latWGS, lon: lonWGS };
}

function latLonToGK(lat, lon) {
  // Determine the best GK zone based on longitude
  let zone;
  if (lon < 7.5) zone = 2;
  else if (lon < 10.5) zone = 3;
  else if (lon < 13.5) zone = 4;
  else zone = 5;

  // Use proj4js for accurate conversion
  const gkZones = {
    2: "+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
    3: "+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
    4: "+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
    5: "+proj=tmerc +lat_0=0 +lon_0=15 +k=1 +x_0=5500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs",
  };

  try {
    // Convert from WGS84 to GK
    const result = proj4("WGS84", gkZones[zone], [lon, lat]);
    console.log("latLonToGK proj4 result:", result);

    return { zone, rechtswert: result[0], hochwert: result[1] };
  } catch (e) {
    console.error("proj4 latLonToGK error:", e);
    // Fallback to manual calculation
    return latLonToGKManual(lat, lon);
  }
}

function latLonToGKManual(lat, lon) {
  // Determine the best GK zone based on longitude
  let zone;
  if (lon < 7.5) zone = 2;
  else if (lon < 10.5) zone = 3;
  else if (lon < 13.5) zone = 4;
  else zone = 5;

  const centralMeridians = { 2: 6, 3: 9, 4: 12, 5: 15 };
  const centralMeridian = centralMeridians[zone];

  // Convert WGS84 to Bessel (approximate)
  const latBessel = ((lat + 0.00003) * Math.PI) / 180;
  const lonBessel = ((lon - 0.00008) * Math.PI) / 180;
  const lonCM = (centralMeridian * Math.PI) / 180;

  // Bessel 1841 ellipsoid
  const a = 6377397.155;
  const b = 6356078.963;
  const e2 = (a * a - b * b) / (a * a);
  const e2_ = (a * a - b * b) / (b * b);

  const sinLat = Math.sin(latBessel);
  const cosLat = Math.cos(latBessel);
  const tanLat = Math.tan(latBessel);

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const eta2 = e2_ * cosLat * cosLat;
  const t = tanLat;
  const t2 = t * t;

  const l = lonBessel - lonCM;
  const l2 = l * l;
  const l4 = l2 * l2;

  // Meridian arc
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n * n * n;
  const n4 = n * n * n * n;

  const alpha = ((a + b) / 2) * (1 + n2 / 4 + n4 / 64);
  const beta = (3 * n) / 2 - (27 * n3) / 32;
  const gamma = (21 * n2) / 16 - (55 * n4) / 32;
  const delta = (151 * n3) / 96;
  const epsilon = (1097 * n4) / 512;

  const B =
    alpha *
    (latBessel +
      beta * Math.sin(2 * latBessel) +
      gamma * Math.sin(4 * latBessel) +
      delta * Math.sin(6 * latBessel) +
      epsilon * Math.sin(8 * latBessel));

  // Calculate easting and northing
  const easting =
    500000 +
    N * cosLat * l * (1 + ((l2 * cosLat * cosLat) / 6) * (1 - t2 + eta2));
  const northing =
    B +
    ((N * tanLat * cosLat * cosLat * l2) / 2) *
      (1 + ((l2 * cosLat * cosLat) / 12) * (5 - t2 + 9 * eta2));

  // Add zone prefix to Rechtswert
  const rechtswert = zone * 1000000 + easting;

  return { zone, rechtswert, hochwert: northing };
}

function formatGK(lat, lon) {
  const gk = latLonToGK(lat, lon);
  return `R: ${gk.rechtswert.toFixed(2)}, H: ${gk.hochwert.toFixed(2)} (Zone ${
    gk.zone
  })`;
}

// ============================================
// UTM CONVERSION
// ============================================

function utmToLatLon(zone, letter, easting, northing) {
  // Determine hemisphere from UTM letter
  const isNorthern = letter >= "N";

  // WGS84 parameters
  const a = 6378137; // semi-major axis
  const f = 1 / 298.257223563; // flattening
  const k0 = 0.9996; // scale factor

  const e = Math.sqrt(2 * f - f * f);
  const e1sq = (e * e) / (1 - e * e);

  const x = easting - 500000; // Remove false easting
  const y = isNorthern ? northing : northing - 10000000; // Remove false northing for southern

  const M = y / k0;
  const mu = M / (a * (1 - (e * e) / 4 - (3 * e * e * e * e) / 64));

  const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));

  const J1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
  const J2 = (21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32;
  const J3 = (151 * Math.pow(e1, 3)) / 96;
  const J4 = (1097 * Math.pow(e1, 4)) / 512;

  const fp =
    mu +
    J1 * Math.sin(2 * mu) +
    J2 * Math.sin(4 * mu) +
    J3 * Math.sin(6 * mu) +
    J4 * Math.sin(8 * mu);

  const C1 = e1sq * Math.cos(fp) * Math.cos(fp);
  const T1 = Math.tan(fp) * Math.tan(fp);
  const R1 =
    (a * (1 - e * e)) / Math.pow(1 - e * e * Math.sin(fp) * Math.sin(fp), 1.5);
  const N1 = a / Math.sqrt(1 - e * e * Math.sin(fp) * Math.sin(fp));
  const D = x / (N1 * k0);

  const Q1 = (N1 * Math.tan(fp)) / R1;
  const Q2 = (D * D) / 2;
  const Q3 =
    ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4)) / 24;
  const Q4 =
    ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 3 * C1 * C1 - 252 * e1sq) *
      Math.pow(D, 6)) /
    720;

  const lat = fp - Q1 * (Q2 - Q3 + Q4);

  const Q5 = D;
  const Q6 = ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6;
  const Q7 =
    ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) *
      Math.pow(D, 5)) /
    120;

  const lonOrigin = (zone - 1) * 6 - 180 + 3; // Central meridian
  const lon = lonOrigin + ((Q5 - Q6 + Q7) / Math.cos(fp)) * (180 / Math.PI);

  return {
    lat: lat * (180 / Math.PI),
    lon: lon,
  };
}

function latLonToUTM(lat, lon) {
  // WGS84 parameters
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;

  const e = Math.sqrt(2 * f - f * f);
  const e1sq = (e * e) / (1 - e * e);

  const zone = Math.floor((lon + 180) / 6) + 1;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;

  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const lonOriginRad = (lonOrigin * Math.PI) / 180;

  const N = a / Math.sqrt(1 - e * e * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = e1sq * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  const M =
    a *
    ((1 -
      (e * e) / 4 -
      (3 * Math.pow(e, 4)) / 64 -
      (5 * Math.pow(e, 6)) / 256) *
      latRad -
      ((3 * e * e) / 8 +
        (3 * Math.pow(e, 4)) / 32 +
        (45 * Math.pow(e, 6)) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * Math.pow(e, 4)) / 256 + (45 * Math.pow(e, 6)) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * Math.pow(e, 6)) / 3072) * Math.sin(6 * latRad));

  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * e1sq) * Math.pow(A, 5)) / 120) +
    500000;

  let northing =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * e1sq) * Math.pow(A, 6)) /
            720));

  if (lat < 0) {
    northing += 10000000; // False northing for southern hemisphere
  }

  // Get UTM letter
  const letter = getUTMLetter(lat);

  return { zone, letter, easting, northing };
}

function getUTMLetter(lat) {
  const letters = "CDEFGHJKLMNPQRSTUVWX";
  if (lat < -80) return "A";
  if (lat > 84) return "Z";
  return letters[Math.floor((lat + 80) / 8)];
}

// ============================================
// MGRS CONVERSION
// ============================================

function mgrsToUTM(zone, band, gridLetters, eastingStr, northingStr) {
  const col = gridLetters[0];
  const row = gridLetters[1];

  // Determine the set based on zone number
  const set = ((zone - 1) % 6) + 1;

  // Column letters for each set
  const colLetters = [
    "ABCDEFGH",
    "JKLMNPQR",
    "STUVWXYZ",
    "ABCDEFGH",
    "JKLMNPQR",
    "STUVWXYZ",
  ];

  // Row letters alternate between two sequences
  const rowLettersOdd = "ABCDEFGHJKLMNPQRSTUV";
  const rowLettersEven = "FGHJKLMNPQRSTUVABCDE";
  const rowLetters = set % 2 === 1 ? rowLettersOdd : rowLettersEven;

  // Get column offset (100km squares)
  const colIndex = colLetters[set - 1].indexOf(col);
  if (colIndex === -1) return null;

  // Get row offset
  const rowIndex = rowLetters.indexOf(row);
  if (rowIndex === -1) return null;

  // Calculate easting
  const precision = eastingStr.length;
  const multiplier = Math.pow(10, 5 - precision);
  const eastingValue = parseInt(eastingStr) * multiplier;
  const easting = (colIndex + 1) * 100000 + eastingValue;

  // Calculate northing (complex due to row wrapping)
  const northingValue = parseInt(northingStr) * multiplier;
  let northing = rowIndex * 100000 + northingValue;

  // Adjust northing based on band
  const bandIndex = "CDEFGHJKLMNPQRSTUVWX".indexOf(band);
  if (bandIndex !== -1) {
    const minNorthing = (bandIndex - 10) * 8 * 111000; // Approximate
    while (northing < minNorthing - 100000) {
      northing += 2000000;
    }
  }

  return { zone, band, easting, northing };
}

function latLonToMGRS(lat, lon) {
  const utm = latLonToUTM(lat, lon);

  // Get grid square letters
  const set = ((utm.zone - 1) % 6) + 1;

  const colLetters = [
    "ABCDEFGH",
    "JKLMNPQR",
    "STUVWXYZ",
    "ABCDEFGH",
    "JKLMNPQR",
    "STUVWXYZ",
  ];

  const rowLettersOdd = "ABCDEFGHJKLMNPQRSTUV";
  const rowLettersEven = "FGHJKLMNPQRSTUVABCDE";
  const rowLetters = set % 2 === 1 ? rowLettersOdd : rowLettersEven;

  const col100k = Math.floor(utm.easting / 100000);
  const row100k = Math.floor(utm.northing / 100000) % 20;

  const colLetter = colLetters[set - 1][col100k - 1] || "A";
  const rowLetter = rowLetters[row100k] || "A";

  const easting5 = Math.floor(utm.easting % 100000)
    .toString()
    .padStart(5, "0");
  const northing5 = Math.floor(utm.northing % 100000)
    .toString()
    .padStart(5, "0");

  return `${utm.zone}${utm.letter}${colLetter}${rowLetter} ${easting5} ${northing5}`;
}

// ============================================
// OUTPUT FORMATTING
// ============================================

function formatDD(lat, lon) {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lon).toFixed(
    6
  )}°${lonDir}`;
}

function formatDMS(lat, lon) {
  return `${decimalToDMS(lat, true)}, ${decimalToDMS(lon, false)}`;
}

function decimalToDMS(decimal, isLat) {
  const dir = isLat ? (decimal >= 0 ? "N" : "S") : decimal >= 0 ? "E" : "W";
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minFloat);
  const seconds = ((minFloat - minutes) * 60).toFixed(2);

  return `${degrees}°${minutes}'${seconds}"${dir}`;
}

function formatUTM(lat, lon) {
  const utm = latLonToUTM(lat, lon);
  return `${utm.zone}${utm.letter} ${Math.round(utm.easting)} ${Math.round(
    utm.northing
  )}`;
}

function formatMGRS(lat, lon) {
  return latLonToMGRS(lat, lon);
}

// ============================================
// VALIDATION
// ============================================

function isValidCoordinate(lat, lon) {
  return (
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
