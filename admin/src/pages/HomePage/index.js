/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import pluginPkg from "../../../../package.json";
import {
  createEntries,
  exportEntries,
  getContentTypes,
  updateEntries,
} from "../../services/apiCalls";
import "../../style/global.css";
import "../../style/variables.css";
import { excelToJson, jsonToExcel } from "../../utils/xlsx";

import Alert from "../../components/Alert";
import Button from "../../components/Button";
import ExcelIcon from "../../components/ExcelIcon";
import Modal from "../../components/Modal";
import RadioBtn from "../../components/RadioBtn";
import SelectBtn from "../../components/SelectBtn";
import UploadBtn from "../../components/UploadBtn";

const HomePage = () => {
  const darkMode = useMemo(() =>
    document
      .querySelector("style[data-styled='active']")
      ?.innerHTML.includes("body{background:#181826;}")
    , []);

  const pageTitle = pluginPkg.strapi.displayName;

  const [collectionTypes, setCollectionTypes] = useState([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [dataEntries, setDataEntries] = useState([]);
  const [loader, setLoader] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [errorLogs, setErrorLogs] = useState([]);
  const [modal, setModal] = useState(false);

  const titleClassName = useMemo(() => {
    return `main-title ${darkMode ? "dark-mode" : ""}`;
  }, [darkMode]);

  const contentClassName = useMemo(() => {
    return `content ${darkMode ? "dark-mode" : ""}`;
  }, [darkMode]);

  const containerClassName = useMemo(() => {
    return `container ${darkMode ? "dark-mode" : ""}`;
  }, [darkMode]);

  const collectionsList = useMemo(() => {
    return collectionTypes.map((collection) => ({
      text: collection.info.displayName,
      value: collection.uid,
    }));
  }, [collectionTypes]);

  const convertFile = useCallback((file) => {
    excelToJson(file, setDataEntries);
  }, []);

  const validForm = useCallback(() => {
    if (!selectedAction) {
      setError("Choose an action");
      return false;
    }
    if (!selectedCollection) {
      setError("Choose a collection");
      return false;
    }
    if (!dataEntries.length && selectedAction !== "export") {
      setError("Upload an .xls of .xlsx file");
      return false;
    }
    setError("");
    return true;
  }, [selectedAction, selectedCollection, dataEntries.length]);

  const submit = useCallback(async () => {
    if (!validForm()) return false;

    setLoader(true);
    try {
      switch (selectedAction) {
        case "create":
          const createRes = await createEntries({
            query: selectedCollection.value,
            data: dataEntries,
          });
          if (createRes.success) {
            setSuccess(createRes.success.message);
          }
          if (createRes.error) {
            setError(createRes.error.message);
            setErrorLogs(createRes.error.data);
            console.log(createRes.error.data);
          }
          break;
        case "update":
          const updateRes = await updateEntries({
            query: selectedCollection.value,
            data: dataEntries,
          });
          if (updateRes.success) {
            setSuccess(updateRes.success.message);
          }
          if (updateRes.error) {
            setError(updateRes.error.message);
            setErrorLogs(updateRes.error.data);
            console.log(updateRes.error.data);
          }
          break;
        case "export":
          const exportRes = await exportEntries({
            query: selectedCollection.value,
          });
          const collectionName = `${selectedCollection.value.split(".")[1]}s`;
          jsonToExcel(collectionName, exportRes.data);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoader(false);
    }
  }, [selectedAction, selectedCollection, dataEntries, validForm]);

  useEffect(() => {
    const fetchContentTypes = async () => {
      try {
        const res = await getContentTypes();
        const collections = Object.keys(res.data).filter((key) => {
          if (!res.data[key].plugin && res.data[key].kind === "collectionType") {
            setCollectionTypes((init) => [...init, res.data[key]]);
            return true;
          }
          return false;
        });
        if (!collections.length) setModal(true);
      } catch (err) {
        console.error("Error fetching content types:", err);
        setError("Failed to load content types");
      }
    };

    fetchContentTypes();
  }, []);

  return (
    <div>
      <h1 className={titleClassName}>{pageTitle}</h1>
      <div className={contentClassName}>
        <div className={containerClassName}>
          <RadioBtn
            title="Choose an action :"
            items={[
              { text: "Export", value: "export" },
              { text: "Create", value: "create" },
              { text: "Update", value: "update" },
            ]}
            selected={selectedAction}
            select={setSelectedAction}
            darkMode={darkMode}
          />
          <SelectBtn
            title="Choose a collection :"
            items={collectionsList}
            selected={selectedCollection}
            select={setSelectedCollection}
            defaultValue="Select collection"
            darkMode={darkMode}
          />
          <UploadBtn
            title="Upload Excel file :"
            action={convertFile}
            disabled={selectedAction === "export"}
            darkMode={darkMode}
          >
            <ExcelIcon darkMode={darkMode} />
          </UploadBtn>
          <Button
            click={submit}
            loading={loader}
            text="Submit"
            darkMode={darkMode}
          />
          {(success || error) && (
            <Alert>
              {success && <p className="success">{success}</p>}
              {error && <p className="error">{error}</p>}
              {errorLogs.length > 0 && (
                <a
                  className="logs"
                  onClick={() => jsonToExcel("errors", errorLogs)}
                >
                  Download errors
                </a>
              )}
            </Alert>
          )}
          {modal && (
            <Modal>
              <p>You must have one collection type created at least</p>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
