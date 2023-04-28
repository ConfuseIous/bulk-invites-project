import { useState } from "react";
import cx from "classnames";
import * as XLSX from "xlsx";

// get SendBulkInvitesSchema zod schema
import {
  BulkInvitesSchemaType,
  SendBulkInvitesSchemaType,
} from "./api/sendBulkInvites";

export default function Home() {
  const [data, setData] = useState<SendBulkInvitesSchemaType>([]);
  const [selectedFile, setSelectedFile] = useState(null);

  function sendBulkInvites() {}

  const changeHandler = async (event: any) => {
    if (event.target.files[0].size > 64000000) {
      // 64000000 bytes = 64 MB
      // TODO: Replace with custom alert component
      alert("File is too big!");
      return;
    }

    setSelectedFile(event.target.files[0]);
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
