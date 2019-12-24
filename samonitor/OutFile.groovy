package samonitor

class OutFile {
    File file
    String file_name

    public OutFile(def filename)
    {
        file = new File(filename)
        file_name = filename
    }

    public void append(String s)
    {
        file.append(System.getProperty("line.separator") + s)
    }

    public String getFileName() {
        return file_name
    }

    String getText() {
        file.getText()
    }
    String removeFileText() {
        file.setText("")
    }
}
