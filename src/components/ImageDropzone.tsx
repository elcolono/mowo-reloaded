import { Box, Text, VStack } from "@chakra-ui/layout";
import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { FileError, FileRejection, useDropzone } from "react-dropzone";
import { Center, Icon, StackDivider } from "@chakra-ui/react";
import { BsFillCloudArrowUpFill } from "react-icons/bs";
import SingleFileUploadWithProgress from "./SingleFileUploadWithProgress";
import { Image, ImageInput } from "../API";
import UploadError from "./UploadError";
import Storage from "@aws-amplify/storage";

/**
 * Maps an server Image object to an UploadableFile, which is needed by the Dropzone component.
 * @param {Image} img
 * @return {UploadableFile}
 */
async function mapImageInputToUploadableImage(img: Image): Promise<UploadableFile> {
  const result = await Storage.get(img.key, { download: true });
  const uplFile: UploadableFile = {
    file: new File([result.Body as Blob], "name"),
    key: img.key,
    errors: [],
  };
  return uplFile;
}

export interface UploadableFile {
  file: File;
  errors: FileError[];
  key?: string;
}

export interface ImageDropzoneProps {
  initialValues?: Image[];
  onChange: (files: ImageInput[]) => void;
}

/**
 * Renders a image drop zone with image previews
 * @return {ReactElement}
 */
export default function ImageDropzone({
  initialValues,
  onChange,
}: ImageDropzoneProps): ReactElement {
  const [files, setFiles] = useState<UploadableFile[]>([]);

  const onDrop = useCallback((accFiles: File[], rejFiles: FileRejection[]) => {
    const mappedAcc = accFiles.map((file) => ({ file, errors: [] }));
    setFiles((curr) => [...curr, ...mappedAcc, ...rejFiles]);
  }, []);

  // Set initial values
  useEffect(() => {
    async function loadImages() {
      const images = await Promise.all<UploadableFile>(
        initialValues.map((img) => mapImageInputToUploadableImage(img))
      );
      setFiles((curr) => [...curr, ...images]);
    }

    if (initialValues) {
      loadImages();
    }
  }, [initialValues]);

  // Run onChange if files changes
  useEffect(() => {
    onChange(files.map((fw) => ({ key: fw.key })));
  }, [files]);

  function onDelete(file: File) {
    setFiles((currFiles) => currFiles.filter((fw) => fw.file !== file));
  }

  function onUpload(file: File, key: string) {
    setFiles((currFiles) =>
      currFiles.map((fw) => {
        if (fw.file === file) {
          return { ...fw, key };
        }
        return fw;
      })
    );
  }

  const { getRootProps, getInputProps } = useDropzone({
    accept: ["image/*"],
    onDrop: onDrop,
    maxSize: 300 * 1024, // 300KB
  });

  return (
    <>
      <Box
        border="dotted"
        borderRadius="lg"
        borderColor="gray.300"
        borderWidth="medium"
        {...getRootProps({ className: "dropzone" })}
      >
        <Center height="200px">
          <input {...getInputProps()} />
          <VStack>
            <Icon w="24" h={"24"} as={BsFillCloudArrowUpFill} color="gray.500" />
            <Text align="center">Drag and drop some files here, or click to select files</Text>
          </VStack>
        </Center>
      </Box>
      <VStack divider={<StackDivider borderColor="gray.200" />} spacing={4} align="stretch">
        {files.map((fw, idx) => (
          <>
            {fw.errors.length ? (
              <UploadError key={idx} file={fw.file} errors={fw.errors} onDelete={onDelete} />
            ) : (
              <SingleFileUploadWithProgress
                key={idx}
                file={fw.file}
                onDelete={onDelete}
                onUpload={onUpload}
              />
            )}
          </>
        ))}
      </VStack>
      {JSON.stringify(files)}
    </>
  );
}
