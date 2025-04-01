import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

const UkrainianVocabularyExplorer = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storyFilter, setStoryFilter] = useState('');
  const [wordFilter, setWordFilter] = useState('');
  const [uniqueStories, setUniqueStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState('');
  const [showFirstAppearance, setShowFirstAppearance] = useState(false);
  const [sortBy, setSortBy] = useState('frequency');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/lemma_summary.csv');
        const text = await response.text();


        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Get the data
            const parsedData = results.data;

            // Extract unique story IDs from column names
            const storyColumns = results.meta.fields
              .filter(col => col.startsWith('count_in_'))
              .map(col => col.replace('count_in_', ''));

            // Sort stories by their numerical prefix if possible
            const sortedStories = storyColumns.sort((a, b) => {
              // Extract numbers from the beginning of story names
              const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999');
              const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999');
              return numA - numB;
            });

            setData(parsedData);
            setUniqueStories(sortedStories);
            setLoading(false);

            // Auto-select the first story if available
            if (sortedStories.length > 0) {
              setSelectedStory(sortedStories[0]);
            }
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(`Error loading file: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStorySelect = (e) => {
    setSelectedStory(e.target.value);
    setShowFirstAppearance(false);
  };

  const handleToggleFirstAppearance = () => {
    setShowFirstAppearance(!showFirstAppearance);
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const getFilteredData = () => {
    if (!data.length) return [];

    let filtered = data;

    // Apply word filter
    if (wordFilter) {
      const lowercaseFilter = wordFilter.toLowerCase();
      filtered = filtered.filter(row =>
        row.lemma && row.lemma.toString().toLowerCase().includes(lowercaseFilter)
      );
    }

    // Apply story filter
    if (selectedStory) {
      if (showFirstAppearance) {
        // Show words that first appear in this story
        filtered = filtered.filter(row => row.first_story === selectedStory);
      } else {
        // Show all words in this story
        const storyColumn = `count_in_${selectedStory}`;
        filtered = filtered.filter(row => row[storyColumn] > 0);
      }
    }

    // Apply sorting
    if (sortBy === 'frequency' && selectedStory) {
      const storyColumn = `count_in_${selectedStory}`;
      filtered = _.orderBy(filtered, [storyColumn], [sortDirection]);
    } else if (sortBy === 'frequency') {
      filtered = _.orderBy(filtered, ['total_count'], [sortDirection]);
    } else if (sortBy === 'alphabetical') {
      filtered = _.orderBy(filtered, ['lemma'], [sortDirection]);
    }

    return filtered.slice(0, 1000); // Limit to 1000 rows for performance
  };

  if (loading) return <div className="p-4 text-center">Loading vocabulary data...</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  const filteredData = getFilteredData();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Ukrainian Vocabulary Explorer</h1>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">Select a Story:</label>
            <select
              value={selectedStory}
              onChange={handleStorySelect}
              className="w-full p-2 border rounded"
            >
              <option value="">All Stories</option>
              {uniqueStories.map(story => (
                <option key={story} value={story}>
                  {story}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">Search Words:</label>
            <input
              type="text"
              value={wordFilter}
              onChange={(e) => setWordFilter(e.target.value)}
              placeholder="Type to filter words..."
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div>
            <label className="font-medium mr-2">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="frequency">Frequency</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="ml-2 px-2 py-1 bg-gray-200 rounded"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {selectedStory && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="firstAppearance"
                checked={showFirstAppearance}
                onChange={handleToggleFirstAppearance}
                className="mr-2"
              />
              <label htmlFor="firstAppearance">Show only words first appearing in this story</label>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          {selectedStory ?
            (showFirstAppearance ?
              `New words introduced in "${selectedStory}"` :
              `All words in "${selectedStory}"`) :
            'All vocabulary'}
        </h2>
        <p className="text-gray-600">
          Showing {filteredData.length} {filteredData.length === 1000 ? '(limited to first 1000)' : ''}
          out of {data.length} total words
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Word (Lemma)</th>
              <th className="py-2 px-4 border">
                {selectedStory ? 'Count in Story' : 'Total Count'}
              </th>
              <th className="py-2 px-4 border">First Appeared In</th>
              <th className="py-2 px-4 border">Is New?</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, index) => {
                const isFirstAppearance = row.first_story === selectedStory;
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 px-4 border font-medium">{row.lemma}</td>
                    <td className="py-2 px-4 border text-center">
                      {selectedStory ? row[`count_in_${selectedStory}`] : row.total_count}
                    </td>
                    <td className="py-2 px-4 border text-sm">
                      {row.first_story}
                      {!isFirstAppearance && selectedStory &&
                        <span className="text-xs text-gray-500 block">
                          (ID: {row.first_story.match(/^(\d+)/)?.[1] || 'N/A'})
                        </span>
                      }
                    </td>
                    <td className="py-2 px-4 border text-center">
                      {isFirstAppearance ?
                        <span className="font-bold text-green-600">Yes</span> :
                        <span className="text-red-600">No</span>
                      }
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center">No matching words found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UkrainianVocabularyExplorer;
