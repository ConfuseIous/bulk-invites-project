import { useState } from "react";
import cx from "classnames";
import * as XLSX from "xlsx";
import { Response } from "../../types/Response";

// get SendBulkInvitesSchema zod schema
import {
  BulkInvitesSchemaType,
  SendBulkInvitesSchemaType,
} from "./api/sendBulkInvites";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);

  function sendBulkInvites() {}

  const changeHandler = async (event: any) => {
    if (event.target.files[0].size > 64000000) {
      // 64000000 bytes = 64 MB
      alert("File is too big!");
      return;
    }

    setSelectedFile(event.target.files[0]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      /*
      XLSX Workbooks are essentially just a zip containing XMLs called Worksheets.
      As we are only interested in the first Worksheet, we can just grab it directly and it is guaranteed to exist unless the XLSX itself is corrupt.
       */

      if (evt.target === null) {
        alert("File does not exist 🦧");
        return;
      }

      const bstr = evt.target.result;

      let wb: XLSX.WorkBook;
      try {
        wb = XLSX.read(bstr, { type: "binary" });
      } catch (e) {
        alert("File is corrupt!");
        setSelectedFile(null);
        return;
      }

      // Get first worksheet
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      // Parse data into objects
      let userData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // Remove header row
      userData.shift();

      console.log(userData);

      let data: SendBulkInvitesSchemaType = [];

      userData.forEach((row: any) => {
        if (row.length < 4) {
          alert("Invalid row detected!");
          return;
        }

        data.push({
          companyName: row[0],
          email: row[1],
          phone: row[2],
          name: row[3],
        });
      });

      console.log(data);

      // call api at /api/sendBulkInvites

      const res = await fetch("/api/sendBulkInvites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const response: Response = await res.json();
      if (response.success) {
        alert("Bulk invites sent!");
      } else {
        alert(response.message);
      }
    };
    reader.readAsBinaryString(event.target.files[0]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-3xl font-bold text-center mb-5">Bulk Invites Demo</h1>
      <div className={cx("flex flex-col bg-base-100 rounded-lg shadow-lg")}>
        <div className="p-6">
          <h2 className="text-lg font-bold">
            Bulk Add Companies & Invite Users
          </h2>
          <p>
            Import an .xlsx file below to bulk add company profiles and bulk
            invite users
          </p>
        </div>
        <hr />
        <div className="flex-1 p-6">
          <div className="flex flex-col justify-center items-center border border-primary-content border-dotted h-full p-10 gap-5">
            <div className="h-20">
              <input
                id="fileInput"
                type="file"
                onChange={changeHandler}
                className="hidden"
                accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // Accept only .xlsx files
              />
              <label htmlFor="fileInput">
                {selectedFile == null ? <p>No File</p> : <p>Selected File</p>}
              </label>
            </div>
            {selectedFile != null ? (
              <p className="text-center">{selectedFile.name}</p>
            ) : (
              <p className="text-lg text-center w-3/4">
                Click to upload .xslx (MAX. 64MB)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
