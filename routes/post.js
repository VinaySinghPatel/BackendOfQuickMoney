const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Post = require('../models/Posts');
const fecthUser = require('../middleware/FetchUser');
const jwt_secret = "ThisIsAnSecret";  


router.post('/createpost', fecthUser, [
    body('tittle').notEmpty().withMessage('Title of the Post'),
    body('money').isLength({ max : 4 }).notEmpty().withMessage('How much money are you offering'),
    body('description').notEmpty().withMessage('Description of your post'),
    body('mobilenumber').notEmpty().isLength({ min : 10 }).withMessage('Number must be at least 10 characters long'),
], async (req, res) => {
    let Success = false;
    try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({ Success, errors: error.array() });
        }

        const { tittle, money, description, mobilenumber } = req.body;
        const newpost = new Post({
            tittle,
            money,
            description,
            mobilenumber,
            user: req.user.id,
            userId : req.user.id
        });

        let savepost = await newpost.save();
        Success = true;
        res.json(savepost);
    } catch (error) {
        console.error("Error creating post:", error.message);
        res.status(500).send("Some error occurred while creating the post");
    }
});


router.get('/getallpost/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "User ID is required." });
        }
        let posts = await Post.find({ user: id });
        res.json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error.message);
        res.status(500).send("Some error occurred in GetAllPost API");
    }
});

router.get('/getalldbpost', async (req,res)=>{
    try {
        // Post.find() yaha hm bina fetchuser ke sari post dekh sakte hain
            let posts = await Post.find().populate('userId', 'name email');
            res.json(posts);
    } catch (error) {
        console.error("Error fetching all user posts:", error.message);
        res.status(500).send("Error occurred while fetching all posts");
    }
})


router.put('/updatepost/:id', fecthUser, async (req, res) => {
    try {
        const { tittle, money, description, mobilenumber } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json("Post not found");
        }

        let NewPost = {};
        if (tittle) NewPost.tittle = tittle;
        if (money) NewPost.money = money;
        if (description) NewPost.description = description;
        if (mobilenumber) NewPost.mobilenumber = mobilenumber;

        if (post.user.toString() !== req.user.id) {
            return res.status(403).json("Unauthorized to update this post");
        }

        const updatedPost = await Post.findByIdAndUpdate(req.params.id, { $set: NewPost }, { new: true });
        res.json(updatedPost);
    } catch (error) {
        console.error("Error updating post:", error.message);
        res.status(500).send("There is an error in the update post API");
    }
});

router.delete('/deletepost/:id', fecthUser, async (req, res) => {
    try {
     let post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "No post found with this ID" });
        }

        if (post.user.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized to delete this post" });
        }
 post = await Post.findByIdAndDelete(req.params.id);
        res.json({
            tittle: post.tittle,
            money: post.money,
            mobilenumber: post.mobilenumber,
            Success: "The note has been deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting post:", error.message);
        res.status(500).send("There was an error in the delete post API");
    }
});

module.exports = router;
