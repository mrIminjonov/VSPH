const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid'); // Import UUID for unique IDs

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure journals directory exists
const journalsDir = path.join(__dirname, 'journals');
try {
    if (!fs.existsSync(journalsDir)) {
        fs.mkdirSync(journalsDir, { recursive: true });
        console.log('Journals directory created:', journalsDir);
    }
} catch (err) {
    console.error('Error creating journals directory:', err);
}

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'journals', 'images');
try {
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log('Images directory created:', imagesDir);
    }
} catch (err) {
    console.error('Error creating images directory:', err);
}

// Ensure files directory exists
const filesDir = path.join(__dirname, 'journals', 'files');
try {
    if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
        console.log('Files directory created:', filesDir);
    }
} catch (err) {
    console.error('Error creating files directory:', err);
}

// Set up storage for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'imageFile') {
            cb(null, path.join(__dirname, 'journals', 'images'));
        } else if (file.fieldname === 'fileFile') {
            cb(null, path.join(__dirname, 'journals', 'files'));
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from the root directory
app.use('/login', express.static(path.join(__dirname, 'login'))); // Serve static files from the login directory

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/main.html', (req, res) => {
    const mainFilePath = path.join(__dirname, 'main.html');
    fs.stat(mainFilePath, (err, stats) => {
        if (err || !stats.isFile()) {
            console.error('main.html not found:', err);
            return res.status(404).send('main.html not found');
        }
        res.sendFile(mainFilePath);
    });
});

// Serve registration page
app.get('/registration.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'registration.html'));
});

app.post('/register', (req, res) => {
    const userData = req.body;
    console.log('Registration request received:', userData); // Log the received data
    const filePath = path.join(__dirname, 'user.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading user data file:', err);
            return res.status(500).json({ message: 'Internal Server Error: Unable to read user data' });
        }

        let users = [];
        try {
            if (data) {
                users = JSON.parse(data);
            }
        } catch (parseErr) {
            console.error('Error parsing user data:', parseErr);
            return res.status(500).json({ message: 'Internal Server Error: Unable to parse user data' });
        }

        // Check if the user already exists
        const userExists = users.find(user => user.email === userData.email || user.username === userData.username);
        if (userExists) {
            console.log('User already registered:', userData.username, userData.email);
            return res.status(400).json({ message: 'User already registered' });
        }

        users.push(userData);

        fs.writeFile(filePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                console.error('Error writing to file', err);
                return res.status(500).json({ message: 'Internal Server Error: Unable to save user data' });
            } else {
                console.log('User registered successfully:', userData.username, userData.email);
                res.status(200).json({ message: 'User data saved successfully' });
            }
        });
    });
});

app.post('/login', (req, res) => {
    console.log('Login request received:', req.body); // Log the request body
    const loginData = req.body;
    const filePath = path.join(__dirname, 'user.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).json({ message: 'Internal Server Error' });
            return;
        }

        try {
            const users = JSON.parse(data);
            console.log('Users loaded:', users); // Log the loaded users
            const user = users.find(user => (user.email === loginData.username || user.username === loginData.username) && user.password === loginData.password);

            if (user) {
                console.log('Login successful for user:', user.username); // Log successful login
                // Redirect to main.html after successful login
                res.status(200).json({ message: 'Login successful' });
            } else {
                console.log('Invalid email/username or password'); // Log invalid login attempt
                res.status(401).json({ message: 'Invalid email/username or password' });
            }
        } catch (parseErr) {
            console.error('Error parsing user data:', parseErr);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    });
});

// New Endpoint - Upload Admin Journal
app.post('/uploadAdminJournal', upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'fileFile', maxCount: 1 }]), (req, res) => {
    const journalId = uuidv4(); // Generate a unique ID for the journal
    let imageFile, fileFile;

    try {
        imageFile = req.files['imageFile'][0];
        fileFile = req.files['fileFile'][0];
    } catch (err) {
        console.error('Error accessing uploaded files:', err);
        return res.status(400).json({ success: false, message: 'Missing files' });
    }

    if (!imageFile || !fileFile) {
        return res.status(400).json({ success: false, message: 'Both image and file are required' });
    }

    const journal = {
        id: journalId,
        journalName: req.body.journalName,
        description: req.body.description,
        issn: req.body.issn,
        author: req.body.author,
        imagePath: path.join('journals', 'images', imageFile.filename),
        filePath: path.join('journals', 'files', fileFile.filename),
        publishedAt: new Date().toISOString()
    };
    const filePath = path.join(__dirname, 'journals', 'adminadd.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        let journals = [];
        if (!err) {
            try {
                if (data) {
                    journals = JSON.parse(data);
                }
            } catch (parseErr) {
                console.error('Error parsing admin journals', parseErr);
                return res.status(500).json({ success: false, message: 'Error parsing journal data' });
            }
        } else if (err.code !== 'ENOENT') {
            console.error('Error reading admin journals file', err);
            return res.status(500).json({ success: false, message: 'Error reading journal data' });
        }

        journals.push(journal);
        fs.writeFile(filePath, JSON.stringify(journals, null, 2), (err) => {
            if (err) {
                console.error('Error writing admin journals file', err);
                return res.status(500).json({ success: false, message: 'Error writing to file' });
            }
            // Respond with JSON true
            res.json({ success: true, message: 'Journal published successfully!' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
