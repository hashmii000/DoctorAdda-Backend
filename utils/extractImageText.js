import Tesseract from "tesseract.js";

export const extractImageText = async (filePath) => {
  const result = await Tesseract.recognize(
    filePath,
    "eng",
    {
      logger: m => console.log(m), // optional
      tessedit_char_whitelist:
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.%:/()- ",
    }
  );

  return result.data.text;
};